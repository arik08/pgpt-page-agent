"""설정. `.env` 파일과 환경 변수에서 읽는다 (환경 변수가 우선)."""

from __future__ import annotations

import os
import socket
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if value[:1] in "\"'" and value[-1:] == value[:1] and len(value) >= 2:
            value = value[1:-1]
        elif " #" in value:
            value = value.split(" #", 1)[0].strip()
        # .env가 OS 환경 변수보다 우선한다 (다른 도구가 OPENAI_* 를 이미 잡아 둔 PC가 많다).
        # 빈 값은 '설정 안 함'으로 보고 덮어쓰지 않는다.
        if value:
            os.environ[key.strip()] = value


def _flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "on", "yes", "y")


def lan_ip() -> str | None:
    """같은 망의 다른 PC가 접속할 내 IP. 패킷은 보내지 않는다 (UDP connect는 경로만 고름)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
            return None if ip.startswith("127.") else ip
    except OSError:
        return None


@dataclass(frozen=True)
class Settings:
    provider: str               # "openai" | "codex"
    model: str
    reasoning_effort: str       # "" 이면 보내지 않음
    web_search: bool
    openai_api_key: str
    openai_base_url: str
    codex_base_url: str
    codex_auth_path: Path
    host: str
    port: int
    public_url: str             # 비어 있으면 요청 주소로 정함
    max_page_chars: int
    request_timeout: float

    @property
    def shared_on_lan(self) -> bool:
        return self.host not in ("127.0.0.1", "localhost", "::1")


def load_settings() -> Settings:
    load_dotenv(ROOT / ".env")
    env = os.environ.get

    codex_auth = Path(env("CODEX_AUTH_PATH") or (Path(env("CODEX_HOME") or Path.home() / ".codex") / "auth.json"))
    api_key = (env("OPENAI_API_KEY") or "").strip()

    provider = (env("AGENT_PROVIDER") or "auto").strip().lower()
    if provider not in ("openai", "codex"):
        provider = "openai" if api_key else "codex"

    if provider == "openai":
        model = env("AGENT_MODEL") or "gpt-6.1-luna"
    else:
        # Codex(ChatGPT 계정)에서는 gpt-6.1-luna가 지원되지 않는다 (2026-11 확인).
        model = env("AGENT_CODEX_MODEL") or "gpt-6-luna"

    # Codex OAuth는 개인 구독이므로 기본값은 내 PC에서만 열어 둔다. 공유하려면 AGENT_HOST=0.0.0.0.
    host = env("AGENT_HOST") or ("0.0.0.0" if provider == "openai" else "127.0.0.1")

    return Settings(
        provider=provider,
        model=model,
        reasoning_effort=(env("AGENT_REASONING_EFFORT", "low") or "").strip(),
        web_search=_flag("AGENT_WEB_SEARCH", True),
        openai_api_key=api_key,
        openai_base_url=(env("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/"),
        codex_base_url=(env("CODEX_BASE_URL") or "https://chatgpt.com/backend-api/codex").rstrip("/"),
        codex_auth_path=codex_auth,
        host=host,
        port=int(env("AGENT_PORT") or 8787),
        public_url=(env("AGENT_PUBLIC_URL") or "").rstrip("/"),
        max_page_chars=int(env("AGENT_MAX_PAGE_CHARS") or 60000),
        request_timeout=float(env("AGENT_REQUEST_TIMEOUT") or 180),
    )
