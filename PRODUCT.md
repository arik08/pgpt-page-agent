# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Python FastAPI 서버(사용자 PC에서 실행) + 순수 JS·CSS·SVG 위젯. 위젯은 북마클릿이 서버에서 불러와 페이지에 Shadow DOM으로 주입한다. 외부 CDN을 쓰지 않는다 (사내망·https 혼합 콘텐츠·CSP 때문).

## Users

- 호스트 사용자: 자기 PC에서 서버를 띄우고 웹을 보다가 지금 보는 페이지에 대해 바로 묻는다.
- 사내 같은 망의 동료: 설치 페이지에서 북마클릿을 받아 아무 브라우저 창에서나 같은 에이전트를 쓴다. 확장 프로그램 설치 없이.

## Product Purpose

웹 브라우징 중 오른쪽 아래 버튼을 누르면 언제든 열리는 AI 에이전트. 지금 띄워 둔 페이지 내용을 읽고 그 페이지에 대한 질문에 바로 답하며, 필요하면 웹 검색으로 보충한다. 성공 = 페이지를 떠나거나 복사·붙여넣기 하지 않고 답을 얻는 것.

## Positioning

설치 없는 북마클릿 하나로, 사용자가 보고 있는 바로 그 페이지를 맥락으로 삼는다. 서버 한 대를 사내 여러 사람이 공유한다.

## Operating Context

- 브라우저: 사내 Chrome·Edge. 사내 http 시스템과 외부 https 사이트 둘 다에서 쓴다.
- https 페이지에서 http 사내 서버를 부를 때는 Chrome Local Network Access(사용자 허용 팝업)와 혼합 콘텐츠 제한을 거친다.
- 북마클릿은 페이지를 새로 열 때마다 다시 눌러야 한다 (북마클릿의 본래 한계).

## Capabilities and Constraints

- LLM: 실사용은 OpenAI Responses API, 모델 `gpt-6.1-luna`, `web_search` 도구.
- 집에서 테스트할 때는 Codex OAuth(ChatGPT 구독, `~/.codex/auth.json`)로 같은 Responses 형식을 쓴다. Codex에서는 `gpt-6.1-luna`가 지원되지 않아 테스트 모델은 `gpt-6-luna`.
- 패널 기능: 새 대화, 창 확대(확대 상태에서는 축소), 닫기.
- 접근 제한 없음: 같은 망에서 주소를 알면 누구나 쓴다 (사용자 결정).

## Brand Commitments

- 생물이 아니지만 살아 숨쉬는 듯한 모션이 모든 동작(누름, 대기, 생각, 검색, 답변 중 등)에 들어간다. 컨셉을 먼저 정하고 세부 동작은 그다음에 설계한다.
- 아이콘은 Lucide. 직접 그리지 않는다.
- 글자 크기: 본문 16px·줄 간격 1.7 안팎, 보조 13~14px(13px 미만 금지), 코드·표 14~15px.

## Evidence on Hand

없음. 사용 후기·사용자 수 같은 주장은 만들지 않는다.

## Product Principles

1. 지금 보는 페이지가 기본 맥락이다. 묻기 전에 복사하게 만들지 않는다.
2. 어느 사이트 위에서도 깨지지 않는다. 호스트 페이지의 스타일·스크립트와 격리한다.
3. 기다리는 시간에도 무엇을 하고 있는지 보인다 (읽기, 생각, 검색, 답변).
4. 실패는 이유와 다음 행동을 함께 알린다.
