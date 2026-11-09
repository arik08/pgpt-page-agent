---
name: 페이지 에이전트
description: 지금 보는 페이지에 바로 답하는 쇳물 한 방울. 온도가 곧 상태다.
colors:
  heat-000: "#3e3834"
  heat-010: "#4e130a"
  heat-020: "#801b0b"
  heat-032: "#b6270e"
  heat-045: "#db430f"
  heat-058: "#f16b16"
  heat-070: "#ff912c"
  heat-082: "#ffc05e"
  heat-092: "#ffe5aa"
  heat-100: "#fff9ec"
  bg: "#141210"
  bg2: "#1b1815"
  bg3: "#25211d"
  bg4: "#312b26"
  float: "#2b2622"
  line: "rgba(238,226,214,.09)"
  line2: "rgba(238,226,214,.17)"
  text-strong: "#fff6ee"
  text: "#eee7e0"
  text2: "#b5aba2"
  text3: "#958b82"
  ink-on-heat: "#1c0d04"
  selection: "rgba(240,106,22,.38)"
typography:
  display:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  panel-title:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-0.003em"
  body-small:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum'"
  code:
    fontFamily: "D2Coding, 'JetBrains Mono', Consolas, 'Courier New', monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Pretendard Variable', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  panel: "20px"
  pill: "999px"
  full: "50%"
spacing:
  hairline: "2px"
  tight: "4px"
  snug: "6px"
  base: "8px"
  cozy: "10px"
  block: "12px"
  inset: "14px"
  gutter: "20px"
  message: "24px"
components:
  orb:
    size: "60px"
    rounded: "{rounded.full}"
  panel:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.panel}"
    width: "420px"
    height: "min(660px, calc(100vh - 120px))"
  panel-expanded:
    width: "min(900px, calc(100vw - 48px))"
    height: "calc(100vh - 120px)"
  panel-header:
    padding: "12px 10px 12px 20px"
    height: "64px"
    typography: "{typography.panel-title}"
  icon-button:
    size: "38px"
    rounded: "{rounded.md}"
    backgroundColor: "transparent"
    textColor: "{colors.text2}"
  icon-button-hover:
    backgroundColor: "{colors.bg3}"
    textColor: "{colors.text}"
  send-button:
    size: "38px"
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.bg4}"
    textColor: "{colors.text3}"
  send-button-ready:
    backgroundColor: "{colors.heat-045}"
    textColor: "#fff8ef"
  send-button-stop:
    backgroundColor: "{colors.bg4}"
    textColor: "{colors.text}"
  button-secondary:
    height: "34px"
    padding: "0 12px"
    rounded: "{rounded.md}"
    backgroundColor: "{colors.bg3}"
    textColor: "{colors.text}"
    typography: "{typography.data}"
  button-secondary-hover:
    backgroundColor: "{colors.bg4}"
  suggestion:
    padding: "9px 14px"
    rounded: "{rounded.lg}"
    backgroundColor: "{colors.bg2}"
    textColor: "{colors.text}"
    typography: "{typography.body-small}"
  suggestion-hover:
    backgroundColor: "{colors.bg3}"
  input-field:
    padding: "6px 6px 6px 14px"
    rounded: "{rounded.xl}"
    backgroundColor: "{colors.bg2}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  chip:
    height: "30px"
    padding: "0 10px"
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.bg2}"
    textColor: "{colors.text2}"
    typography: "{typography.label}"
  source-chip:
    padding: "5px 10px"
    rounded: "{rounded.pill}"
    backgroundColor: "{colors.bg2}"
    textColor: "{colors.text2}"
    typography: "{typography.label}"
  user-bubble:
    padding: "9px 14px"
    rounded: "16px 16px 6px 16px"
    backgroundColor: "{colors.bg3}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  tooltip:
    padding: "6px 10px"
    rounded: "{rounded.sm}"
    backgroundColor: "{colors.float}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
  install-bookmarklet:
    height: "3rem"
    padding: "0 1.25rem 0 .875rem"
    rounded: "{rounded.pill}"
    textColor: "{colors.ink-on-heat}"
---

# Design System: 페이지 에이전트

## Overview

**Creative North Star: "쇳물 한 방울"**

에이전트는 생물이 아니라 뜨거운 금속 한 방울이다. 스스로 빛나고, 출렁이고, 식어 간다. 이 세계의 색과 움직임은 모두 한 규칙에서 나온다. 온도가 곧 상태다. 온도 `T`(0~1) 하나가 방울의 색, 빛 번짐, 출렁임 속도, 패널 윗선의 열빛, 그리고 포커스·보내기·링크 같은 UI 강조색을 함께 정한다. 색을 바꾸지 않는다. 데워지고 식을 뿐이다.

바탕은 따뜻한 흑연이다. 거의 검은 갈색 네 단(`bg`→`bg4`)과 슬래그 회색 헤어라인 두 단으로 층을 나누고, 그림자는 호스트 페이지 위에 떠 있는 판에만 검게 깐다. 빛은 쇳물에서만 나온다. 방울의 halo, 답 끝의 녹은 구슬 커서, 페이지를 훑는 열선, 패널 윗선의 열빛, 불티가 그것이다. 밀도는 상용 챗봇 수준으로 여유 있게 둔다. 본문 16px, 줄 간격 1.7이다.

움직임은 물리를 따른다. 데워질 때는 빠르고(초당 2.6) 식을 때는 느리다(초당 0.42). 그래서 답이 끝난 뒤 몇 초에 걸쳐 식는 모습이 보인다. 오류만 담금질처럼 초당 9로 순식간에 식는다. 누르면 표면장력으로 퍼졌다 튕기고, 스크롤하면 점성 때문에 쇳물이 반대로 쏠리며, 커서가 220px 안에 오면 관성으로 최대 3.5px 기운다. 새로 나타나는 것은 뜨겁게 나와 식는다. 스프링은 실제 스프링 식을 CSS `linear()`로 구워 쓴다. `prefers-reduced-motion`에서는 출렁임·기울기·불티·열선·튕김·고리를 끄고, 온도 색은 상태 정보이므로 남긴다. 거부한 기본형은 파란·보라 그라데이션 구슬이 숨쉬는 AI 위젯이다.

**Key Characteristics:**
- 흑체복사 램프 한 줄이 모든 강조색이다. 강조색은 고르지 않고 온도에서 계산한다.
- 따뜻한 흑연 무채색 네 단과 헤어라인 두 단으로 층을 나눈다.
- 빛을 내는 것은 쇳물뿐이고, 높이는 검은 그림자로만 표시한다.
- 상태마다 정해진 온도와 에너지가 있고, 모든 전환은 데워짐·식음으로 보인다.
- 새로 나타난 글자와 조각은 뜨거운 색으로 나와 본문색으로 식는다.
- 위젯은 남의 페이지에 주입되므로 Shadow DOM 안에서 px로 고정한다.

## Colors

흑체복사 램프 한 줄과 따뜻한 흑연 무채색으로 이루어진 팔레트다. 강조색은 램프 위의 한 점이며, 그 점은 지금 온도가 정한다.

### Primary
흑체복사 램프(`RAMP`, web/agent.js). 키 이름의 숫자는 램프 위치 `T`이고, `heat(T)`가 사이를 선형 보간한다.
- **식은 쇠** (heat-000, T 0): 오류 담금질의 목표색이다. 오류 카드 바탕(32%)에 쓴다.
- **검붉음** (heat-010, T 0.10): 식어 가는 쇳물의 가장자리, 방울 테두리 쪽 그라데이션.
- **짙은 체리** (heat-020, T 0.20): 대기 중 방울 몸통(대기 온도 0.19)의 색이다. 숨쉴 때 이 근처를 오간다.
- **체리** (heat-032, T 0.32): 방울에 마우스를 올렸을 때의 목표 온도. 오류 카드 테두리(60%).
- **밝은 체리** (heat-045, T 0.45): 페이지 읽기 온도. 입력창에 커서가 있을 때 `--heat-ui`가 이 근처라서, 보내기 준비 버튼의 쉬는 모습이 이 색이다.
- **주황** (heat-058, T 0.58): 생각 단계 근처. 설치 페이지의 고정 강조(`--ember`)와 글자 선택 색이 이 단의 표본이다.
- **밝은 주황** (heat-070, T 0.70): 웹 검색 온도.
- **노랑** (heat-082, T 0.82): 답변 중 방울 몸통.
- **볏짚** (heat-092, T 0.92): `--heat-ui`가 닿을 수 있는 가장 뜨거운 쪽.
- **흰빛** (heat-100, T 1): 첫 등장의 흰빛 방울, 패널을 여는 쇳물 가장자리, 불티 심지.

런타임 토큰은 frontmatter에 고정할 수 없어 여기 적는다. `--heat` = `heat(T)`(방울 몸통), `--heat-ui` = `heat(clamp(T + 0.18, 0.28, 0.9))`(모든 UI 강조), `--heat-k` = `T`(빛의 세기). 세 값은 위젯 루트에서 T가 0.006 넘게 변할 때만 다시 쓴다.

### Neutral
- **흑연 바탕** (bg): 패널, 입력부, 설치 페이지의 바탕.
- **그을음** (bg2): 입력창, 칩, 출처 칩, 제안 버튼, 표 머리, 설치 페이지 안내 상자처럼 바탕 위에 놓인 면.
- **재** (bg3): 사용자 말풍선, 아이콘 버튼 hover, 보조 버튼, 키 표시(`kbd`).
- **슬래그** (bg4): 보내기 대기 상태, 보조 버튼 hover, 스크롤바 손잡이.
- **떠 있는 재** (float): 툴팁과 토스트처럼 잠깐 떠오르는 작은 판.
- **헤어라인** (line): 패널 테두리, 머리·입력부 구분선, 카드·칩·표 테두리.
- **진한 헤어라인** (line2): 입력창 테두리, 보조 버튼, 툴팁, hover 때 짙어지는 테두리, 인용문 왼쪽 선.
- **주괴 흰빛** (text-strong): 답변 안 제목, 굵은 글씨, 빈 상태 인사, 설치 페이지 h1·h2.
- **본문** (text): 본문과 입력 글자. 흑연 위 대비 15.3:1.
- **보조** (text2): 패널 부제, 공정 기록 문구, 칩 글자, 아이콘 버튼 기본색. 흑연 위 8.3:1.
- **흐림** (text3): placeholder, 목록 기호, 검색 줄 아이콘, 꼬리표. 흑연 위 5.6:1, 재 위 4.8:1.
- **쇳물 위 먹** (ink-on-heat): 뜨거운 채움 위의 글자. 설치 페이지의 북마클릿 버튼과 단계 번호 원판.
- **선택** (selection): 텍스트 선택 바탕. 선택된 글자는 흰색.

### Named Rules
**The One Temperature Rule.** 위젯 안의 살아 있는 UI 강조색(포커스 링, 보내기 준비, 링크, 인용 칩, 선택 칩, 검색 막대, 입력 커서, 패널 윗선)은 모두 지금 온도 하나, `--heat-ui`에서 나온다. 고정 열색을 UI에 박지 않는다. 지난 온도를 함께 보여 주는 것은 공정 기록 띠뿐이고, 그것은 기록이기 때문이다.

**The Hotter-Edge Rule.** `--heat-ui`는 방울 몸통보다 0.18 뜨겁게 잡고 0.28(체리)과 0.9(볏짚) 사이로 자른다. 대기 중에도 흑연 위에서 3:1 넘게 보이고, 가장 뜨거울 때도 흰빛까지 가지 않아 열색으로 읽히게 하기 위해서다.

**The Mix-Don't-Pick Rule.** 강조 tint는 새 hex를 고르지 않고 `--heat-ui`를 섞어 만든다. 글자는 흰색과 40~52%, 테두리는 투명과 45~65%, 채움은 투명과 10~28%로 섞는다(`color-mix(in srgb, ...)`).

**The Ink Flip Rule.** 열색 채움 위의 글자는 채움 온도로 정한다. 밝은 체리(heat-045)보다 차가운 채움에는 밝은 글자를, 그보다 뜨거운 채움에는 쇳물 위 먹(ink-on-heat)을 쓴다.

**The Fixed Sample Rule.** 온도가 흐르지 않는 정적 화면(설치 페이지)은 램프의 고정 표본을 쓴다. 쇳물로 만든 물건(북마클릿 버튼, 단계 원판)만 열색으로 채우고, 나머지 강조(링크, 포커스)는 밝은 주황~노랑 구간(T 0.70~0.82)의 고정값이다.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, 맑은 고딕, Apple SD Gothic Neo, system-ui)
**Body Font:** Pretendard Variable (같은 스택)
**Label/Mono Font:** D2Coding (with JetBrains Mono, Consolas)

**Character:** 산세리프 한 가족으로 무게만 바꿔 위계를 세운다. 본문 400, 이름과 표 머리 600~650, 제목 700~750이다. 웹 글꼴을 내려받지 않고(외부 CDN 없음) 설치된 글꼴을 쓰며, 한글은 어절 단위로 줄을 바꾼다.

### Hierarchy
- **Display** (750, 2.25rem, 1.25): 설치 페이지 h1에만 쓴다. 34rem 이하 화면에서는 1.875rem.
- **Headline** (700, 21px, 1.4): 위젯에서 가장 큰 글자로, 빈 상태 인사에 쓴다. 색은 주괴 흰빛.
- **Title** (700, 17px, 1.45): 답변 안 제목(h2~h4). 답변 안 h1만 19px. 설치 페이지 h2는 같은 역할로 1.125rem.
- **Panel title** (650, 16px, 1.35): 패널 머리의 이름.
- **Body** (400, 16px, 1.7): 답변 본문, 말풍선, 설치 페이지 본문(1rem). 입력창은 같은 크기에 줄 간격 1.6. 설치 페이지 머리말(lead)은 1.125rem.
- **Body small** (400, 15px, 1.6): 빈 상태 부제, 제안 버튼, 오류 메시지, 설치 페이지 버튼(.9375rem).
- **Data** (400, 14px, 1.5, tabular-nums): 표(줄 간격 1.55), 검색 줄, 보조 버튼.
- **Code** (400, 14px, 1.6): 인라인 코드와 코드 블록. 설치 페이지 서버 주소는 .9375rem.
- **Label** (400, 13px, 1.4): 패널 부제, 칩, 출처 칩, 공정 기록 문구, 꼬리표, 툴팁, 안내 문구. 설치 페이지는 .875rem, 키 표시는 .8125rem.

### Named Rules
**The Sixteen-and-Thirteen Rule.** 본문은 16px·줄 간격 1.7 안팎, 보조 글자는 13~14px이고 13px보다 작은 글자는 없다. 코드와 표는 14~15px이다. 회사의 22~24인치 FHD 모니터(배율 100%)에서 상용 챗봇만큼 읽혀야 한다.

**The Host-Proof Pixel Rule.** 위젯(Shadow DOM 안)은 px로, 설치 페이지는 rem으로 크기를 정한다. 위젯은 남의 페이지에 주입되므로 rem을 쓰면 호스트의 루트 글자 크기(예: `html{font-size:62.5%}`)를 따라가 깨진다. 그래서 `:host{all:initial}`로 상속을 끊고 px로 고정한다. 브라우저 확대(Ctrl +)는 px도 함께 키우므로 확대 접근성은 유지된다. 설치 페이지는 우리 서버가 소유한 화면이라 `html{font-size:100%}` 위에 rem을 쓴다.

**The Cooling Type Rule.** 스트리밍 중 새로 도착한 글자는 램프 0.62~1.0의 뜨거운 색으로 나와 0.9초 안에 본문색으로 식는다. 다시 그리는 것은 쓰이는 중인 마지막 블록뿐이고, 다 식은 글자는 정적인 본문이다. 말풍선·칩·출처처럼 새로 놓이는 조각의 글자도 같은 방식(cast, 약 1초)으로 주황에서 식는다.

**The Keep-All Rule.** 모든 화면에 `word-break: keep-all`과 `overflow-wrap: anywhere`를 함께 건다. 한글 어절은 쪼개지 않고, 긴 주소만 어디서든 끊는다.

## Layout

위젯은 화면 오른쪽 아래에 고정된다. 방울의 누름 영역은 60px이고 오른쪽·아래에서 24px 떨어진다(방향 계약은 54px였으나, 빌드는 60px 누름 영역 안에 약 50px 몸통을 그린다). 패널은 방울 바로 위(아래에서 96px, 방울과 12px 간격)에 붙고 420px × `min(660px, 100vh − 120px)`이다(계약의 640px보다 빌드가 20px 높다). 확대하면 `min(900px, 100vw − 48px)` × `100vh − 120px`로 늘어나고, 대화·입력부·머리 내용은 가운데 760px 기둥에 맞춘다. 새 창 모드(`/panel` 팝업)에서는 패널이 창을 꽉 채우고(반경·테두리·그림자 없음) 44px 방울이 머리 왼쪽으로 들어가며, 같은 760px 기둥을 쓴다.

화면 폭이 520px 이하이면 패널은 좌우 12px 안쪽으로 펴지고 아래 88px, 높이 `100vh − 104px`가 되며, 방울은 가장자리에서 16px로 다가선다. 거친 포인터(터치)에서는 아이콘 버튼과 보내기가 44px, 칩의 지우기가 32px로 커진다.

패널 안 리듬은 다음과 같다. 머리는 최소 64px(안쪽 12/10/12/20px), 대화 목록은 20/20/6px, 입력부는 10/14/14px이다. 메시지와 메시지 사이는 24px(`message`), 문단·목록·표·코드 블록 사이는 12px(`block`), 칩과 출처 칩 사이는 6px(`snug`), 머리 아이콘 버튼과 공정 기록 띠 조각 사이는 2px(`hairline`)이다. 패널 좌우 여백 20px(`gutter`)과 입력부·말풍선 안쪽 14px(`inset`)가 가장 자주 쓰는 수평 간격이다.

설치 페이지는 46rem 한 단 기둥이다. 안쪽 여백은 4.5rem 1.5rem 7rem, 섹션 제목 위는 3.25rem, 설치 단계는 2rem 번호 칸 + 나머지 칸의 격자에 단계 사이 1.25rem이다. 34rem 이하에서는 정보 목록이 한 단으로 쌓인다.

## Elevation & Depth

평평한 흑연 위에 밝기 단으로 층을 쌓는 방식이다. 위로 올라올수록 밝아진다. 흑연 바탕(`bg`) 위에 그을음(`bg2`)의 면, 그 위에 재(`bg3`)의 들린 요소, 맨 위에 슬래그(`bg4`)가 놓인다. 그림자는 호스트 페이지 위에 떠 있는 판과 들린 버튼에만 쓰고, 언제나 검정이다. 열빛(halo, 윗선, 구슬, 열선, 뜨거운 글자의 번짐)은 높이가 아니라 쇳물의 온도를 보여 주는 빛이다.

### Shadow Vocabulary
- **패널** (`box-shadow: 0 30px 70px -18px rgba(0,0,0,.6), 0 12px 28px -10px rgba(0,0,0,.4)`): 호스트 페이지 위에 뜬 대화 패널. 넓고 부드럽게, 아래로 떨어진다.
- **떠 있는 작은 판** (`box-shadow: 0 10px 24px -8px rgba(0,0,0,.55)`): 툴팁.
- **들린 버튼** (`box-shadow: 0 6px 14px -6px rgba(0,0,0,.65)`): 보내기 준비 상태. 설치 페이지 북마클릿 버튼은 같은 꼴을 더 깊게 쓰고 안쪽 윗선 하이라이트를 더한다.
- **윗선 열빛** (`box-shadow: 0 1px calc(4px + var(--heat-k) * 16px) var(--heat-ui)`): 패널 윗선 2px. 온도가 오를수록 번짐이 커진다. 높이가 아니라 열빛이다.

### Named Rules
**The Light-Is-Heat Rule.** 빛을 내는 것은 쇳물뿐이다. 방울 halo, 녹은 구슬 커서, 페이지를 훑는 열선, 패널 윗선, 불티, 뜨겁게 나온 글자, 불티가 닿아 불붙는 검색 아이콘이 그렇다. 쇳물이 닿은 순간의 빛은 1초 안에 식는다. 쉬는 상태의 버튼·카드·입력창·칩은 발광 그림자를 갖지 않는다.

**The Black Drop Rule.** 높이는 검은 그림자로만 표시한다. 그림자는 아래로 떨어지고(y 양수) 퍼짐은 음수다. 색 있는 그림자로 높이를 나타내지 않는다.

**The Ring-Not-Glow Rule.** 포커스는 `--heat-ui` 2px 실선 외곽선으로 보인다. 입력창은 포커스 때 테두리를 `--heat-ui` 65%로 바꾸고 흐림 없는 3px 고리(`--heat-ui` 14%)를 두른다.

## Shapes

둥근 사각형이 기본이고, 큰 것일수록 반경이 크다. 패널 20px, 입력창과 말풍선 16px, 보내기·제안·오류 카드·코드 블록 12px, 아이콘 버튼·보조 버튼·표 테두리 10px, 칩·툴팁 8px, 칩 안의 지우기 버튼 6px 순이다. 알약(999px)은 출처 칩, 본문 안 인용 칩, 설치 페이지 북마클릿 버튼처럼 떼어 쓰는 조각에만 쓴다. 사용자 말풍선은 오른쪽 아래 모서리 하나만 6px로 줄여 입력창 쪽 꼬리를 만든다. 테두리는 1px 헤어라인 두 단계뿐이고, 더 굵은 선은 2px 포커스 외곽선과 패널 윗선 열빛뿐이다. 공정 기록 띠는 4px 높이에 조각 반경 2px, 조각 간격 2px이다.

**The Round-Is-Molten Rule.** 완전한 원은 쇳물에만 쓴다. 방울, 녹은 구슬 커서, 읽지 않음 고리, 설치 페이지의 단계 번호 원판과 북마클릿 점이 그렇다. 쇳물이 아닌 UI 요소는 원으로 만들지 않는다.

## Components

### Buttons
차분한 흑연 위에서 누르는 순간에만 살짝 눌리는 버튼들이다.
- **아이콘 버튼** (패널 머리, 답변 도구): 38px 정사각, 반경 10px, 바탕 없음, 보조 글자색. hover 때 재 바탕과 본문색(0.15초). 누르면 0.9배로 눌린다. 포커스는 `--heat-ui` 2px 안쪽 외곽선. 비활성은 40% 불투명. 답변 도구 줄에서는 34px에 아이콘 18px. 아이콘을 바꿀 때(복사→확인, 확대→축소) 새 아이콘이 0.6배·-35°에서 260ms에 자리 잡는다.
- **보내기**: 38px, 반경 12px. 비어 있으면 슬래그 바탕에 흐림 글자, 글이 있으면 `--heat-ui` 바탕에 밝은 화살표와 들린 버튼 그림자, 답변 중에는 Lucide `square` 정지 아이콘에 슬래그 바탕. 색은 0.25초에 바뀌고, 누르면 0.88배. frontmatter의 `send-button-ready` 바탕(heat-045)은 듣기 상태의 스냅샷이고, 실제 값은 언제나 `--heat-ui`다.
- **보조 버튼** (오류의 "다시 시도", "새 창으로 열기"): 34px, 반경 10px, 진한 헤어라인 테두리, 재 바탕, 14px 글자, 아이콘 16px. hover 때 슬래그. 설치 페이지의 "복사" 버튼도 같은 꼴(2.5rem, 반경 .75rem)이다.
- **제안 버튼** (빈 상태): 그을음 바탕, 헤어라인 테두리, 반경 12px, 15px 글자. hover 때 테두리가 짙어지고 재 바탕, 누르면 0.98배.
- **북마클릿 버튼** (설치 페이지): 3rem 알약. 위에서 아래로 밝은 주황에서 주황으로 채운 쇳물 조각에 쇳물 위 먹 글자(700), 안쪽 윗선 하이라이트, 왼쪽에 녹은 구슬 점. hover 때 1px 들리고, 누르면 0.98배, 커서는 grab.
- **삭제** (규칙, 아직 기능 없음): 글자 버튼이 아니라 Lucide `trash-2` 아이콘 버튼이다. 한 번 누르면 같은 자리에서 `triangle-alert`로 바뀌고 아직 지우지 않는다. 한 번 더 눌러야 지운다. 툴팁은 "삭제"와 "삭제 경고"이고 평소 툴팁 모양 그대로다. 경고 상태는 몇 초 뒤나 포커스가 떠나면 휴지통으로 돌아간다. 확인 팝업이나 모달은 없다. 두 아이콘은 아직 web/icons.js에 없으므로 tools/fetch_icons.py의 목록에 넣어 다시 생성한다.

### Chips
- **페이지 칩** (입력창 위): 30px, 13px, 보조 글자색, 그을음 바탕, 헤어라인, 반경 8px, 아이콘 15px(`file-text`, 본문 없이 주소만 받았으면 `globe`). 질문을 보내면 한 번 번쩍인다.
- **선택 칩**: 페이지에서 글을 고르면 나타난다. 글자는 `--heat-ui`와 흰색, 테두리와 바탕은 `--heat-ui` tint. 오른쪽에 24px 지우기(`x`). 나타날 때 밝은 노랑 테두리와 3px 고리에서 0.8초에 식고, 글자가 cast된다.
- **출처 칩** (답변 아래): 알약, 13px, 보조 글자색, 그을음 바탕, 헤어라인. 번호는 굵게 본문색. hover 때 본문색과 진한 헤어라인. 답이 끝나면 55ms 간격으로 차례로 굳는다.
- **인용 칩** (본문 안): 알약 13px. 채움은 `--heat-ui` 16%(hover 28%), 글자는 `--heat-ui` 42%와 흰색.

### Cards / Containers
- **패널**: 흑연 바탕, 헤어라인 테두리, 반경 20px, 패널 그림자, 내용 잘라내기. 윗선은 좌우 20px 들인 2px 열빛 선이고 양끝은 투명하게 사라진다. 불투명도는 `0.22 + T × 0.78`. 확대·축소하는 순간 윗선이 끝까지 늘어나며 밝게 번쩍인다.
- **사용자 말풍선**: 재 바탕, 헤어라인, 반경 16/16/6/16px, 안쪽 9/14px, 최대 폭 88%, 오른쪽 정렬. 고른 글을 함께 보냈으면 아래에 13px 흐림 꼬리표와 `text-select` 14px 아이콘.
- **오류 카드**: 담금질의 색이다. 테두리는 체리(heat-032) 60%, 바탕은 식은 쇠(heat-000) 32%, 반경 12px, 15px/1.6 글자, `circle-alert` 18px. 상세는 13px. 아래에 보조 버튼으로 다음 행동을 준다.
- **코드 블록과 표**: 코드 블록은 흑연보다 어두운 우물에 헤어라인, 반경 12px, 14px/1.6. 표는 반경 10px 헤어라인 상자 안에 14px, 머리는 그을음 바탕·보조 글자색·600, 칸 안쪽 8/12px, 숫자는 tabular-nums.
- **설치 페이지 안내 상자와 정보 목록**: 그을음 바탕, 헤어라인, 반경 1rem.

### Inputs / Fields
- **입력창**: 그을음 바탕, 진한 헤어라인 테두리, 반경 16px, 안쪽 6/6/6/14px. textarea는 16px/1.6, 38px에서 시작해 최대 170px까지 자동으로 늘어난다. placeholder는 흐림 글자색, 입력 커서는 `--heat-ui`.
- **포커스**: 테두리가 `--heat-ui` 65%로 바뀌고 흐림 없는 3px 고리(14%)가 0.2초에 둘린다. 입력창에 커서가 들어오면 방울은 듣기 온도(0.28)로 데워지고, 글자를 칠 때마다 살짝 데워지며 떨린다.

### Navigation
- **패널 머리**: 최소 64px. 왼쪽에 이름(16px/650)과 부제(13px 보조 글자색, "도메인 · 페이지 제목" 한 줄 말줄임), 오른쪽에 아이콘 버튼 셋(`square-pen` 새 대화, `maximize-2`/`minimize-2` 확대·축소, `x` 닫기)을 2px 간격으로 둔다. 새 창 모드에서는 확대 버튼이 빠지고 왼쪽에 44px 방울이 들어온다.

### 쇳물 방울 (Signature)
에이전트 자신이다. JS가 매 프레임 그리는 SVG 방울이다.
- **몸**: 몸통 원과 대류 덩어리 넷을 goo 필터(블러 + 알파 문턱)로 붙여 액체 윤곽을 만들고, 그 윤곽 안에 온도 방사 그라데이션(심 `heat(T + 0.21)`, 중간 `heat(T)`, 가장자리 `heat(T − 0.24)`), 대류 빛, 산화 껍질(T 0.42 아래에서 나타나 식을수록 짙어짐), 반사광(뜨거울수록 흐려짐), 바닥 그림자를 그린다. 바깥 halo는 반경 `31 + 24T`, 불투명도 `0.16 + 0.5T`로 온도와 함께 커진다.
- **상태별 온도와 에너지** (`PHASES`): 대기 0.19/0.14, 듣기 0.28/0.30, 페이지 읽기 0.46/0.50, 생각 0.62/0.78, 웹 검색 0.72/0.95, 답변 중 0.86/0.60, 오류 0/0.30, 읽지 않은 답 0.30. 에너지는 출렁임과 대류 속도다. 새 상태는 이 표에 온도와 에너지 한 쌍으로 더한다.
- **숨**: 대기·듣기에서는 6초 주기로 온도 ±0.032, 크기 2.2%가 오르내린다. 활동 중에는 2.2초 주기로 ±0.012의 맥박.
- **손에 닿는 반응**: 마우스를 올리면 0.32까지 데워지며 4.5% 부풀고, 누르면 0.40까지 데워지며 가로로 퍼지고 세로로 눌린다. 떼면 위로 튕겨 출렁이다 제자리. 읽지 않은 답이 있으면 `--heat-ui` 고리가 2.8초마다 퍼진다.
- **첫 등장**: 흰빛(T 1) 방울이 위에서 떨어져 내려앉고(스프링), 불티가 튀고, 식으며 검붉어진다.
- **패널 열기·닫기**: 열 때는 방울 중심에서 원이 번지듯 패널이 드러나고(약 0.56초), 번지는 가장자리가 흰빛에서 주황으로 식는다. 글자들은 방울에서 가까운 것부터 cast된다. 닫을 때는 같은 원이 방울로 빨려 들어가고(약 0.3초), 방울이 받아 삼키며 부풀고 데워진다.
- **새 대화**: 기존 메시지가 아래 것부터 주황으로 달아올라 흐려지며 녹아내린다. 방울이 받아 데워지고 불티가 튄다.

### 공정 기록 띠 (Signature)
- 각 답변 위의 4px 띠(최대 300px)다. 페이지 읽기·생각·웹 검색·답변 구간을 실제로 걸린 시간에 비례한 길이로, 그 구간의 온도 색(`heat(0.46)`, `heat(0.62)`, `heat(0.74)`, `heat(0.88)`)으로 칠한다.
- 아래에 13px 보조 글자색 상태 문구가 한 번에 하나만 보이고, 바뀔 때 아래에서 위로 넘어온다. 끝나면 "생각 1.2초 · 웹 검색 2회 · 전체 6.8초" 꼴의 요약이 남는다.
- **검색 줄**: 14px 보조 글자색, `search` 16px 흐림 아이콘. 검색어가 오기 전에는 150×10px 막대 위로 `--heat-ui` 아지랑이가 1.4초마다 지나간다. 방울에서 날아온 불티가 닿으면 아이콘이 흰빛으로 불붙었다가 `--heat-ui`로 식는다.

### 흐르는 답
- 본문은 16px/1.7, 제목과 굵은 글씨는 주괴 흰빛, 링크는 `--heat-ui`와 흰색을 섞은 글자에 tint 밑줄(hover 때 글자색 밑줄).
- 쓰이는 중인 마지막 블록만 다시 그리고, 새 글자는 The Cooling Type Rule대로 식는다. 끝에는 9px 녹은 구슬 커서가 흰빛·노랑·주황 방사 채움과 열빛 번짐으로 1.1초마다 맥박친다. 스트림이 끝나면 전체를 한 번 다시 그려 정적인 본문으로 굳힌다.

### 툴팁
- 앱 자체 툴팁만 쓴다(`data-tip` 속성). 브라우저 기본 `title` 툴팁은 쓰지 않는다.
- 마우스를 1초(1000ms) 머물러야 뜬다. 요소 위 8px 가운데에 놓이고 위 공간이 없으면 아래로 가며, 화면 가장자리에서 8px 안쪽에 머문다.
- 떠 있는 재 바탕, 진한 헤어라인, 13px/1.4, 안쪽 6/10px, 반경 8px, 작은 검은 그림자, 0.12초 페이드.
- 누르는 순간과 포커스가 떠날 때 숨는다. 터치에서는 띄우지 않는다. 누른 직후에 띄우지 않고, 경고 같은 상태에서도 색을 바꾸지 않는다.

### 아이콘
- Lucide만 쓴다(v1.70.0). tools/fetch_icons.py가 web/icons.js를 만들고, 위젯은 `[태그, 속성]` 배열을 `createElementNS`로 그린다(innerHTML·외부 CDN 없음). 새 아이콘은 그 스크립트의 `ICONS` 목록에 이름을 넣고 다시 생성한다.
- 선 굵기 2, 둥근 끝, `currentColor`. 크기는 패널 머리 20px, 답변 도구·오류 18px, 검색 줄·보조 버튼 16px, 칩·꼬리표 14~15px.

## Do's and Don'ts

### Do:
- **Do** 위젯의 모든 강조색을 `--heat-ui`(방울 자체는 `--heat`)에서 가져오고, tint는 `color-mix`로 흰색이나 투명과 섞어 만든다.
- **Do** 새 상태가 생기면 `PHASES`에 온도와 에너지 한 쌍으로 더하고, 전환은 데워짐(초당 2.6)과 식음(초당 0.42)으로 보이게 한다.
- **Do** 본문 16px·줄 간격 1.7, 보조 글자 13~14px, 코드·표 14px로 쓴다.
- **Do** 위젯 안에서는 px, 설치 페이지처럼 서버가 소유한 화면에서는 rem을 쓴다.
- **Do** 새로 나타나는 글자와 조각은 뜨거운 색으로 내보내 1초 안에 본문색으로 식힌다.
- **Do** 아이콘은 tools/fetch_icons.py로 Lucide에서 가져오고, 선 굵기 2·`currentColor`로 그린다.
- **Do** 툴팁은 `data-tip`과 앱 툴팁으로, 1초 머물렀을 때만 띄운다.
- **Do** 삭제는 `trash-2` → `triangle-alert` 두 번 누르기로, 같은 버튼 자리에서 끝낸다.
- **Do** 포커스는 `--heat-ui` 2px 외곽선으로 늘 보이게 하고, 거친 포인터에서는 누름 영역을 44px로 키운다.
- **Do** `prefers-reduced-motion`에서는 움직임만 끄고 온도 색은 남긴다.

### Don't:
- **Don't** 파란·보라 그라데이션 구슬이나 램프 밖 색조(파랑, 보라, 초록)를 강조색으로 쓰지 않는다.
- **Don't** 쉬는 상태의 버튼·카드·입력창·칩에 흐릿한 발광 그림자(색 있는 blur `box-shadow`, `drop-shadow`)를 주지 않는다. 빛은 쇳물의 것이다.
- **Don't** 높이를 색 있는 그림자로 표시하지 않는다. 높이 그림자는 검정만 쓴다.
- **Don't** 위젯 안에서 rem을 쓰거나 호스트 스타일을 상속받지 않는다(`:host{all:initial}` 유지).
- **Don't** 13px보다 작은 글자를 쓰지 않는다.
- **Don't** 아이콘을 손으로 그리거나, 글자 기호나 아이콘 글꼴로 대신하지 않는다.
- **Don't** 브라우저 `title` 툴팁, 삭제 확인 팝업이나 모달을 쓰지 않는다.
- **Don't** 위젯 UI에 고정 열색을 박아 지금 온도와 다른 두 번째 열색을 만들지 않는다.
