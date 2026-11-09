"""페이지 에이전트 서버.

- GET  /            설치 페이지 (북마클릿 받기)
- GET  /agent.js    북마클릿이 불러가는 위젯
- GET  /panel       새 창(팝업) 모드 — 페이지에 직접 붙일 수 없는 사이트용
- GET  /demo        시험용 예시 페이지
- GET  /motions     모션 10가지를 나란히 보고 고르는 페이지
- GET  /api/health  상태
- POST /api/chat    질문 → SSE 스트림
"""

from __future__ import annotations

import html
import json
import os
import re
import time
from contextlib import asynccontextmanager
from urllib.parse import quote, urlsplit

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response, StreamingResponse

from .config import WEB, Settings, lan_ip, load_settings
from .prompt import build_body
from .providers import UpstreamError, make_client, stream_response

VERSION = "0.1.0"
settings: Settings = load_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.client = make_client(settings)
    try:
        yield
    finally:
        await app.state.client.aclose()


class CORS:
    """북마클릿은 아무 사이트에서나 호출하므로 모든 출처를 허용한다 (접근 제한 없음은 사용자 결정)."""

    HEADERS = [
        (b"access-control-allow-origin", b"*"),
        (b"access-control-allow-private-network", b"true"),
    ]

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        if scope["method"] == "OPTIONS":
            await send({"type": "http.response.start", "status": 204, "headers": self.HEADERS + [
                (b"access-control-allow-methods", b"GET, POST, OPTIONS"),
                (b"access-control-allow-headers", b"content-type"),
                (b"access-control-max-age", b"600"),
            ]})
            await send({"type": "http.response.body", "body": b""})
            return

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + self.HEADERS
            await send(message)

        await self.app(scope, receive, send_with_cors)


app = FastAPI(title="Page Agent", version=VERSION, docs_url=None, redoc_url=None, openapi_url=None,
              lifespan=lifespan)
app.add_middleware(CORS)

NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate"}


# ---------------------------------------------------------------- 주소·북마클릿

def server_url(request: Request) -> str:
    """동료에게 나눠 줄 서버 주소. localhost로 열었어도 같은 망 주소로 바꿔 준다."""
    if settings.public_url:
        return settings.public_url
    base = str(request.base_url).rstrip("/")
    host = request.url.hostname or ""
    if host in ("localhost", "127.0.0.1", "::1") and settings.shared_on_lan:
        ip = lan_ip()
        if ip:
            return f"{request.url.scheme}://{ip}:{settings.port}"
    return base


LOADER = r"""(function(){var S="__SERVER__",w=window,d=document;
if(w.__pageAgent){w.__pageAgent.toggle();return}if(w.__pageAgentBooting)return;w.__pageAgentBooting=1;w.__pageAgentServer=S;
var lb=/^http:\/\/(localhost|127\.|\[::1\])/i.test(S),tas=location.protocol=="https:"&&/^http:/i.test(S)?(lb?"loopback":"local"):"";w.__pageAgentTAS=tas;
function ok(){return!!w.__pageAgent}function end(){w.__pageAgentBooting=0}
function snap(){var t="";try{t=d.body.innerText||""}catch(e){}return{url:location.href,title:d.title,selection:String(w.getSelection?w.getSelection():"").slice(0,8000),text:t.slice(0,60000),textLength:t.length,via:"popup"}}
function pop(){end();var p=w.open(S+"/panel#u="+encodeURIComponent(location.href)+"&t="+encodeURIComponent(d.title.slice(0,200)),"page_agent","popup,width=480,height=780");
if(!p){alert("페이지 에이전트: 이 사이트에는 바로 붙일 수 없어 새 창으로 열려 했지만 팝업이 막혔습니다. 주소창에서 팝업을 허용한 뒤 다시 눌러 주세요.");return}
if(!w.__pageAgentRelay){w.__pageAgentRelay=1;w.addEventListener("message",function(e){var m=e.data;if(m&&(m.type=="page-agent:hello"||m.type=="page-agent:need-page")&&e.source)e.source.postMessage({type:"page-agent:page",page:snap()},"*")})}}
function inject(){var o=tas?{targetAddressSpace:tas}:{};fetch(S+"/agent.js",o).then(function(r){if(!r.ok)throw 0;return r.text()}).then(function(c){var s=d.createElement("script");s.textContent=c;(d.head||d.documentElement).appendChild(s);ok()?end():pop()}).catch(pop)}
var s=d.createElement("script");s.src=S+"/agent.js?ts="+Date.now();s.onload=function(){ok()?end():inject()};s.onerror=inject;(d.head||d.documentElement).appendChild(s)})();"""


def bookmarklet(server: str) -> str:
    code = LOADER.replace("__SERVER__", server)
    code = re.sub(r"\n", "", code)
    # %·#·공백·역슬래시·한글은 인코딩한다 (javascript: URL은 실행 전에 %xx를 풀기 때문).
    return "javascript:" + quote(code, safe="()=;,.:/'!*_-~[]{}+&|<>?\"$@")


def render_template(name: str, request: Request) -> HTMLResponse:
    server = server_url(request)
    page = (WEB / name).read_text(encoding="utf-8")
    values = {
        "SERVER": server,
        "BOOKMARKLET": bookmarklet(server),
        "PROVIDER": "OpenAI API" if settings.provider == "openai" else "Codex OAuth (테스트)",
        "MODEL": settings.model,
        "WEB_SEARCH": "켜짐" if settings.web_search else "꺼짐",
        "SHARED": "같은 망에 공개" if settings.shared_on_lan else "이 PC에서만 (AGENT_HOST=127.0.0.1)",
        "SHARED_FLAG": "yes" if settings.shared_on_lan else "no",
        "VERSION": VERSION,
        "MOTION": default_motion(),
    }
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", html.escape(value, quote=True))
    return HTMLResponse(page, headers=NO_CACHE)


# ---------------------------------------------------------------- 정적 페이지

@app.get("/", response_class=HTMLResponse)
async def install(request: Request):
    return render_template("install.html", request)


@app.get("/panel", response_class=HTMLResponse)
async def panel(request: Request):
    return render_template("panel.html", request)


@app.get("/demo", response_class=HTMLResponse)
async def demo(request: Request):
    return render_template("demo.html", request)


# 모션 테마: 앞의 것이 기본. 파일은 web/motions/ 아래 (core → molten → themes 순으로 붙인다).
MOTIONS = ["molten", "ferro", "mercury", "plasma", "bubble", "gyro", "swarm", "wave", "eclipse", "crystal"]
MOTION_FILES = ["motions/core.js", "motions/molten.js", "motions/themes.js"]


def default_motion() -> str:
    """.env의 AGENT_MOTION. 모르는 이름이면 쇳물 방울."""
    name = os.environ.get("AGENT_MOTION", "").strip().lower()
    return name if name in MOTIONS else MOTIONS[0]


@app.get("/motions", response_class=HTMLResponse)
async def motions(request: Request):
    return render_template("motions.html", request)


@app.get("/agent.js")
async def agent_js(m: str = ""):
    # m: 북마클릿에 넣어 둔 개인 선택 (/agent.js?m=ferro). 없으면 서버 기본값만 알려 준다.
    head = "window.__pageAgentMotionDefault=" + json.dumps(default_motion()) + ";\n"
    m = m.split("?")[0]   # 북마클릿이 뒤에 ?ts= 를 붙이는 경우
    if m in MOTIONS:
        head += "window.__pageAgentMotion=" + json.dumps(m) + ";\n"
    parts = [(WEB / name).read_text(encoding="utf-8") for name in ["icons.js", *MOTION_FILES, "agent.js"]]
    return Response(head + "\n".join(parts), media_type="application/javascript; charset=utf-8", headers=NO_CACHE)


@app.get("/api/health")
async def health():
    return JSONResponse({"ok": True, "version": VERSION, "provider": settings.provider,
                         "model": settings.model, "webSearch": settings.web_search})


# ---------------------------------------------------------------- 대화

def sse(obj: dict) -> bytes:
    return ("data: " + json.dumps(obj, ensure_ascii=False) + "\n\n").encode("utf-8")


def _search_event(item: dict, status: str) -> dict:
    action = item.get("action") or {}
    queries = action.get("queries") or ([action["query"]] if action.get("query") else [])
    return {"type": "search", "id": item.get("id"), "status": status, "kind": action.get("type") or "search",
            "query": action.get("query") or (queries[0] if queries else ""), "url": action.get("url") or ""}


@app.post("/api/chat")
async def chat(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"error": "JSON 본문이 필요합니다."}, status_code=400)
    messages = payload.get("messages") if isinstance(payload, dict) else None
    if not isinstance(messages, list) or not messages:
        return JSONResponse({"error": "messages가 비어 있습니다."}, status_code=400)
    page = payload.get("page") if isinstance(payload.get("page"), dict) else None
    body = build_body(settings, messages, page)
    client = request.app.state.client
    peer = request.client.host if request.client else "?"
    domain = urlsplit(str((page or {}).get("url") or "")).netloc or "-"

    async def events():
        started = time.monotonic()
        searches = 0
        usage: dict = {}
        outcome = "ok"
        yield sse({"type": "start", "provider": settings.provider, "model": settings.model})
        try:
            async for ev in stream_response(client, settings, body):
                kind = ev.get("type", "")
                if kind == "response.output_text.delta":
                    yield sse({"type": "delta", "text": ev.get("delta", "")})
                elif kind == "response.output_item.added":
                    item = ev.get("item") or {}
                    if item.get("type") == "web_search_call":
                        yield sse(_search_event(item, "in_progress"))
                    elif item.get("type") == "reasoning":
                        yield sse({"type": "phase", "phase": "thinking"})
                elif kind == "response.output_item.done":
                    item = ev.get("item") or {}
                    if item.get("type") == "web_search_call":
                        searches += 1
                        yield sse(_search_event(item, "completed"))
                elif kind == "response.output_text.annotation.added":
                    ann = ev.get("annotation") or {}
                    if ann.get("type") == "url_citation" and ann.get("url"):
                        yield sse({"type": "cite", "url": ann["url"], "title": ann.get("title") or ""})
                elif kind == "response.completed":
                    u = (ev.get("response") or {}).get("usage") or {}
                    usage = {"input": u.get("input_tokens"), "output": u.get("output_tokens")}
                elif kind == "response.incomplete":
                    reason = ((ev.get("response") or {}).get("incomplete_details") or {}).get("reason") or ""
                    outcome = "incomplete"
                    yield sse({"type": "notice", "message": "답변이 길이 제한 등으로 중간에 끝났습니다." if reason else
                               "답변이 중간에 끝났습니다.", "detail": reason})
                elif kind in ("response.failed", "error"):
                    err = ev.get("error") or (ev.get("response") or {}).get("error") or {}
                    detail = err.get("message") if isinstance(err, dict) else str(err)
                    raise UpstreamError("모델이 답을 만들다 실패했습니다.", 500, detail or "")
            yield sse({"type": "done", "usage": usage, "seconds": round(time.monotonic() - started, 1)})
        except UpstreamError as e:
            outcome = f"error {e.status}"
            yield sse({"type": "error", "message": e.message, "status": e.status, "detail": e.detail[:400]})
        finally:
            print(f"[{time.strftime('%H:%M:%S')}] {peer} {settings.provider}/{settings.model} {domain} "
                  f"검색 {searches}회 in={usage.get('input')} out={usage.get('output')} "
                  f"{time.monotonic() - started:.1f}s {outcome}", flush=True)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={**NO_CACHE, "X-Accel-Buffering": "no"})
