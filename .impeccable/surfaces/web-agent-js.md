---
version: 1
slug: "web-agent-js"
primary_target: "web/agent.js"
related_targets: ["web/panel.html"]
---

# 페이지 에이전트 위젯 (북마클릿 주입)

- 범위: web/agent.js 가 그리는 오른쪽 아래 방울 + 대화 패널, web/panel.html 팝업 모드. 방문자 모드: Operate.
- 사용자·일: 웹을 보다가 지금 페이지에 대해 묻고 바로 답을 받는다. 사내 동료도 같은 서버를 북마클릿으로 쓴다.
- 제약: 어느 사이트 위에서도 격리(Shadow DOM, adoptedStyleSheets, innerHTML 금지), 외부 CDN 없음, Lucide 아이콘, 본문 16px.

## Direction contract

THESIS: 에이전트는 쇳물 한 방울이고, 온도가 곧 상태다. 색은 바꾸는 것이 아니라 데워지고 식는다. 파란·보라 그라데이션 구슬이 숨쉬는 업계 기본형을 거부한다.

OWN-WORLD: 따뜻한 흑연 바탕(#141210 계열)과 슬래그 회색 헤어라인, 흑체복사 램프(검붉음→체리→주황→노랑→흰빛) 하나가 모든 강조색이다. 한 화면에 열색은 현재 온도 하나뿐. 패널 윗선은 방울 온도로 빛난다.

STORY: 오른쪽 아래 검붉은 방울이 숨쉰다. 누르면 쇳물이 흘러나와 패널로 굳는다. 물으면 페이지를 열선이 훑고, 방울이 달아오르고, 검색마다 불티가 튄다. 답은 흰빛으로 흘러나와 식으며 글자가 된다. 끝나면 천천히 식는다.

FIRST VIEWPORT: 방울 54px, 오른쪽·아래 24px. 패널 420×640이 방울 위에 붙는다. 헤더: 제목 + 페이지 도메인, 새 대화·확대/축소·닫기 아이콘. 본문: 빈 상태 인사와 제안 3개. 아래: 페이지·선택 칩, 입력창, 보내기.

FORM: 쇳물 방울(내 후보 목록 1위, IMPECCABLE'S PICK으로 사용자가 선택). seed:0bf8b6fc38f20118. 시그니처 움직임: 온도 램프 하나가 상태·색·속도를 모두 결정하고, 새로 나타난 글자는 뜨겁게 나와 식는다. 답변마다 공정 기록 띠(읽기·생각·검색·답변 구간을 실제 걸린 시간 길이로).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
