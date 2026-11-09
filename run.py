"""페이지 에이전트 서버 실행: python run.py"""

from __future__ import annotations

import sys

import uvicorn

from app.config import lan_ip
from app.main import settings


def main() -> None:
    s = settings
    local = f"http://localhost:{s.port}"
    print()
    print("  페이지 에이전트 서버")
    print(f"  모델      {s.model}  ({'OpenAI API' if s.provider == 'openai' else 'Codex OAuth 테스트'})")
    print(f"  웹 검색   {'켜짐' if s.web_search else '꺼짐'}")
    print(f"  설치 페이지  {local}")
    if s.shared_on_lan:
        ip = lan_ip()
        if ip:
            print(f"  동료에게 줄 주소  http://{ip}:{s.port}")
    else:
        print("  지금은 이 PC에서만 열립니다. 같은 망에 공개하려면 .env에 AGENT_HOST=0.0.0.0")
    if s.provider == "codex":
        print("  ※ Codex OAuth는 개인 ChatGPT 구독입니다. 테스트용으로만 쓰고, 공유는 OpenAI API 키로 하세요.")
    print()
    uvicorn.run("app.main:app", host=s.host, port=s.port, log_level="warning",
                reload="--reload" in sys.argv)


if __name__ == "__main__":
    main()
