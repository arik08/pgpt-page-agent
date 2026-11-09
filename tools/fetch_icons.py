"""Lucide 아이콘을 내려받아 위젯용 web/icons.js로 만든다.

위젯은 사내망·https 페이지·CSP 때문에 CDN을 쓸 수 없고, Trusted Types 사이트에서도 돌아가야 해서
SVG 문자열 대신 [태그, 속성] 배열로 넣는다 (createElementNS로 그림).

    python tools/fetch_icons.py            # 기본 버전
    python tools/fetch_icons.py 1.70.0     # 버전 지정
"""

from __future__ import annotations

import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

VERSION = sys.argv[1] if len(sys.argv) > 1 else "1.70.0"
ICONS = [
    "square-pen", "maximize-2", "minimize-2", "x", "arrow-up", "square", "search",
    "file-text", "text-select", "copy", "check", "rotate-ccw", "circle-alert",
    "app-window", "globe",
]
OUT = Path(__file__).resolve().parent.parent / "web" / "icons.js"


def fetch(name: str) -> list:
    url = f"https://unpkg.com/lucide-static@{VERSION}/icons/{name}.svg"
    with urllib.request.urlopen(url, timeout=30) as r:
        root = ET.fromstring(r.read())
    nodes = []
    for el in root:
        tag = el.tag.split("}")[-1]
        nodes.append([tag, dict(el.attrib)])
    if not nodes:
        raise SystemExit(f"빈 아이콘: {name}")
    return nodes


def main() -> None:
    data = {name: fetch(name) for name in ICONS}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(
        "/* Lucide icons v" + VERSION + " (https://lucide.dev) - ISC License, Copyright (c) Lucide Contributors.\n"
        "   tools/fetch_icons.py 로 생성. 직접 고치지 말 것. */\n"
        "window.__pageAgentIcons = " + body + ";\n",
        encoding="utf-8",
    )
    print(f"{len(data)}개 아이콘 → {OUT}")


if __name__ == "__main__":
    main()
