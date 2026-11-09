# 페이지 에이전트

웹 브라우징 중 오른쪽 아래 방울을 누르면 열리는 AI 에이전트입니다. 지금 띄워 둔 페이지를 읽고 그 페이지에 대한 질문에 바로 답하며, 필요하면 OpenAI `web_search`로 최신 정보를 찾습니다.
확장 프로그램 없이 **북마클릿** 하나로 씁니다. 내 PC에서 서버를 띄우면 같은 사내망의 동료도 그 북마클릿으로 같은 에이전트를 쓸 수 있습니다.

- 모델: OpenAI Responses API `gpt-6.1-luna` + `web_search` (실사용)
- 집에서 시험: Codex OAuth(ChatGPT 구독, `~/.codex/auth.json`) — ChatGPT 계정에서는 `gpt-6.1-luna`가 지원되지 않아 `gpt-6-luna`로 시험
- 모션 컨셉: **쇳물 방울** — 온도가 곧 상태. 자세한 동작은 [docs/motion.md](docs/motion.md)

## 빠른 시작

```bash
python -m pip install -r requirements.txt
```

```bash
python run.py
```

Windows에서는 `start.bat`을 두 번 눌러도 됩니다 (필요한 패키지가 없으면 먼저 설치).
서버가 뜨면 브라우저로 `http://localhost:8787`을 열고, **페이지 에이전트** 버튼을 북마크바로 끌어다 놓습니다.

### 집에서 테스트 (Codex OAuth)

`codex login`이 되어 있으면 키 없이 동작합니다. `.env`에 아래만 두면 됩니다.

```
AGENT_PROVIDER=codex
```

Codex 모드는 개인 ChatGPT 구독이라 기본으로 **이 PC에서만**(`127.0.0.1`) 열립니다. 토큰이 만료되면 터미널에서 `codex`를 한 번 실행해 갱신하세요 (서버가 대신 갱신하지 않습니다 — 갱신 토큰은 한 번 쓰면 바뀌어 Codex CLI 로그인이 깨지기 때문).

### 회사에서 실사용 (OpenAI API)

`.env.example`을 `.env`로 복사하고 키를 넣습니다.

```
AGENT_PROVIDER=openai
OPENAI_API_KEY=sk-...
AGENT_MODEL=gpt-6.1-luna
```

OpenAI 모드는 기본으로 같은 망에 공개(`0.0.0.0`)됩니다. 처음 실행할 때 Windows 방화벽이 묻으면 **허용**을 누르세요. 사내 PC 정책으로 들어오는 연결이 막혀 있으면 IT 부서에 포트(기본 8787) 허용을 요청해야 합니다.

## 동료와 같이 쓰기

1. 서버를 띄운 PC에서 `http://localhost:8787`을 엽니다. 설치 페이지가 자동으로 **같은 망 주소**(예: `http://10.20.30.40:8787`)를 넣은 북마클릿을 만들어 줍니다.
2. 동료에게 그 주소를 알려 주면, 동료가 자기 브라우저로 열어 북마클릿을 받습니다.
3. PC의 IP가 자주 바뀌면 `.env`에 `AGENT_PUBLIC_URL=http://고정주소:8787`을 넣어 두세요. 북마클릿은 이 주소를 기억하므로 주소가 바뀌면 다시 받아야 합니다.

접근 제한은 없습니다. 같은 망에서 주소를 아는 사람은 누구나 쓰고, 비용은 서버 PC의 API 키로 나갑니다. 서버 콘솔에는 요청마다 한 줄(시간, 요청한 PC의 IP, 페이지 도메인, 검색 횟수, 토큰 수)만 남고 질문·답변 내용은 남기지 않습니다.

## 쓰는 법

- 아무 페이지에서 북마크를 누르면 방울이 내려앉고 대화창이 열립니다. 다시 누르면 닫힙니다.
- 질문하면 그 순간의 페이지 내용(본문, 지금 화면에 보이는 부분, 같은 출처의 프레임)을 함께 보냅니다.
- 페이지에서 글을 드래그해 고르면 입력창 위에 '선택한 부분' 칩이 생기고, 그 부분을 중심으로 답합니다.
- 헤더 버튼: 새 대화 · 창 확대/축소 · 닫기. `Enter` 보내기, `Shift+Enter` 줄바꿈, `Esc` 멈추기/닫기.
- 대화는 같은 탭·같은 사이트 안에서만 이어집니다 (`sessionStorage`).

## https 사이트와 보안 정책

- https 페이지에서 http 사내 서버를 부르면 Chrome이 **"로컬 네트워크의 기기를 찾고 연결"** 허용을 물을 수 있습니다. 허용하면 됩니다 (사이트마다 한 번).
- 위젯은 Shadow DOM으로 페이지와 격리되고, `innerHTML`을 쓰지 않아 Trusted Types 사이트에서도 동작합니다.
- 페이지의 보안 정책(CSP) 때문에 직접 붙을 수 없는 사이트에서는 북마클릿이 같은 대화창을 **새 창**으로 엽니다. 이때도 원래 페이지 내용을 넘겨받아 답합니다.
- 북마클릿은 페이지를 새로 열 때마다 다시 눌러야 합니다. Chrome PDF 뷰어처럼 스크립트가 돌지 않는 화면에서는 동작하지 않습니다.

## 설정 (`.env`)

| 이름 | 기본값 | 설명 |
|---|---|---|
| `AGENT_PROVIDER` | `auto` | `openai` / `codex`. auto는 `OPENAI_API_KEY`가 있으면 openai |
| `OPENAI_API_KEY` | | OpenAI API 키 |
| `AGENT_MODEL` | `gpt-6.1-luna` | OpenAI 모드 모델 |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI 호환 게이트웨이를 쓸 때만 변경 |
| `AGENT_CODEX_MODEL` | `gpt-6-luna` | Codex 모드 모델 |
| `AGENT_REASONING_EFFORT` | `low` | `low`/`medium`/`high`, 비우면 보내지 않음 |
| `AGENT_WEB_SEARCH` | `on` | 웹 검색 도구 |
| `AGENT_HOST` | openai `0.0.0.0` / codex `127.0.0.1` | 서버가 받을 주소 |
| `AGENT_PORT` | `8787` | 포트 |
| `AGENT_PUBLIC_URL` | 자동 | 북마클릿에 넣을 주소 |
| `AGENT_MAX_PAGE_CHARS` | `60000` | 모델에 넘기는 페이지 본문 최대 글자 수 |

`.env` 값은 PC 환경 변수보다 우선합니다 (다른 도구가 `OPENAI_*`를 잡아 둔 PC가 많아서). 빈 값은 무시합니다.
사내 SSL 검사 환경을 위해 서버는 Windows 인증서 저장소를 그대로 믿고, `HTTPS_PROXY` 같은 프록시 환경 변수를 따릅니다.

## 구조

```
app/main.py        FastAPI: 설치 페이지, /agent.js, /panel, /api/chat(SSE), CORS
app/providers.py   Responses API 스트리밍 (OpenAI 키 / Codex OAuth)
app/prompt.py      시스템 지시문, 페이지 내용 블록, 대화 이력 → input
app/config.py      .env 읽기, 같은 망 IP 찾기
web/agent.js       위젯 (Shadow DOM, SVG 방울, 물리, 불티 캔버스, 마크다운, 스트리밍)
web/icons.js       Lucide 아이콘 (tools/fetch_icons.py로 생성)
web/install.html   설치 페이지 · panel.html 새 창 모드 · demo.html 시험용 예시 페이지
docs/motion.md     모션 명세
```

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| "에이전트 서버에 연결하지 못했어요" | 서버가 켜져 있는지, 방화벽, https 페이지면 로컬 네트워크 허용. 대화창의 **새 창으로 열기**로 우회 |
| "Codex 로그인 토큰이 만료" | 터미널에서 `codex` 한 번 실행 |
| "모델을 쓸 수 없습니다" | `.env`의 모델 이름, 계정 권한 |
| 동료 PC에서 설치 페이지가 안 열림 | `AGENT_HOST=0.0.0.0`인지, 방화벽, 같은 망인지 |
