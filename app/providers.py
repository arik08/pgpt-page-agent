"""Responses API 스트리밍 호출. OpenAI API와 Codex(ChatGPT OAuth)가 같은 요청 형식을 쓴다."""

from __future__ import annotations

import base64
import json
import ssl
import time
import uuid
from typing import AsyncIterator

import httpx

from .config import Settings


class UpstreamError(Exception):
    def __init__(self, message: str, status: int = 0, detail: str = ""):
        super().__init__(message)
        self.message = message
        self.status = status
        self.detail = detail


def make_client(settings: Settings) -> httpx.AsyncClient:
    # Windows 인증서 저장소를 쓰는 기본 컨텍스트: 사내 SSL 검사용 루트 인증서도 그대로 믿는다.
    ctx = ssl.create_default_context()
    timeout = httpx.Timeout(settings.request_timeout, connect=15.0)
    return httpx.AsyncClient(verify=ctx, timeout=timeout, trust_env=True)


def _jwt_exp(token: str) -> float | None:
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return float(json.loads(base64.urlsafe_b64decode(payload))["exp"])
    except Exception:
        return None


def _codex_headers(settings: Settings) -> dict[str, str]:
    path = settings.codex_auth_path
    if not path.is_file():
        raise UpstreamError(
            "Codex 로그인 정보가 없습니다. 터미널에서 `codex login`을 하거나 .env에 OPENAI_API_KEY를 넣으세요.",
            401, str(path))
    try:
        tokens = json.loads(path.read_text(encoding="utf-8"))["tokens"]
        access, account = tokens["access_token"], tokens["account_id"]
    except Exception as e:  # noqa: BLE001
        raise UpstreamError("Codex 로그인 파일을 읽지 못했습니다.", 401, repr(e)) from e
    exp = _jwt_exp(access)
    if exp and exp < time.time() + 30:
        # 리프레시 토큰은 한 번 쓰면 바뀌므로 여기서 갱신하면 Codex CLI 로그인이 깨진다. CLI에 맡긴다.
        raise UpstreamError(
            "Codex 로그인 토큰이 만료되었습니다. 터미널에서 codex를 한 번 실행해 갱신한 뒤 다시 시도하세요.", 401)
    return {
        "Authorization": f"Bearer {access}",
        "chatgpt-account-id": account,
        "OpenAI-Beta": "responses=experimental",
        "originator": "codex_cli_rs",
        "session_id": str(uuid.uuid4()),
        "accept": "text/event-stream",
        "content-type": "application/json",
    }


def _endpoint(settings: Settings) -> tuple[str, dict[str, str]]:
    if settings.provider == "codex":
        return settings.codex_base_url + "/responses", _codex_headers(settings)
    if not settings.openai_api_key:
        raise UpstreamError("OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.", 401)
    return settings.openai_base_url + "/responses", {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "accept": "text/event-stream",
        "content-type": "application/json",
    }


def _friendly(status: int, raw: str, settings: Settings) -> str:
    low = raw.lower()
    if "model" in low and ("not supported" in low or "not_found" in low or "does not exist" in low):
        return f"모델 '{settings.model}'을(를) 쓸 수 없습니다. .env의 모델 이름을 확인하세요."
    if status == 401:
        if settings.provider == "codex":
            return "Codex 로그인이 만료되었거나 올바르지 않습니다. 터미널에서 codex를 실행해 다시 로그인하세요."
        return "API 키가 올바르지 않거나 만료되었습니다. .env의 OPENAI_API_KEY를 확인하세요."
    if status == 403:
        return "이 모델이나 기능(웹 검색 등)을 쓸 권한이 없습니다."
    if status == 429:
        return "요청이 너무 많거나 사용 한도에 도달했습니다. 잠시 후 다시 시도하세요."
    if status >= 500:
        return "모델 서버에 일시적인 오류가 있습니다. 잠시 후 다시 시도하세요."
    return "모델 서버가 요청을 거절했습니다."


def _error_text(body: bytes) -> str:
    try:
        data = json.loads(body)
    except Exception:
        return body.decode("utf-8", "replace")[:600]
    err = data.get("error") if isinstance(data, dict) else None
    if isinstance(err, dict) and err.get("message"):
        return str(err["message"])
    if isinstance(data, dict) and data.get("detail"):
        return str(data["detail"])
    return json.dumps(data, ensure_ascii=False)[:600]


async def stream_response(client: httpx.AsyncClient, settings: Settings, body: dict) -> AsyncIterator[dict]:
    """업스트림 SSE 이벤트를 JSON 객체로 하나씩 내보낸다."""
    url, headers = _endpoint(settings)
    try:
        async with client.stream("POST", url, headers=headers, json=body) as resp:
            if resp.status_code != 200:
                raw = _error_text(await resp.aread())
                raise UpstreamError(_friendly(resp.status_code, raw, settings), resp.status_code, raw)
            data_lines: list[str] = []
            async for line in resp.aiter_lines():
                if line.startswith("data:"):
                    data_lines.append(line[5:].lstrip())
                    continue
                if line == "" and data_lines:
                    payload = "\n".join(data_lines)
                    data_lines = []
                    if payload == "[DONE]":
                        return
                    try:
                        yield json.loads(payload)
                    except json.JSONDecodeError:
                        continue
    except httpx.TimeoutException as e:
        raise UpstreamError("모델 서버 응답이 너무 늦어 중단했습니다. 다시 시도해 주세요.", 504, repr(e)) from e
    except httpx.HTTPError as e:
        raise UpstreamError("에이전트 서버가 모델 서버에 연결하지 못했습니다. 서버 PC의 인터넷·프록시 설정을 확인하세요.",
                            502, repr(e)) from e
