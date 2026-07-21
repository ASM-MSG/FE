# FillMap FE

pnpm 모노레포 — apps/web(React 19 + Vite) + packages(design-tokens · tailwind-preset · ui-web). 디자인 시스템 규칙은 `docs/DESIGN_SYSTEM.md`(6개조), 구조 스펙은 `DESIGN_SYSTEM_SPEC.md`.

## 하네스: 지라 티켓 기반 페이지 개발

**목표:** 지라 티켓(MSG-xxx) 기획을 스펙 → 구현 → 검증 → 커밋으로 완주시킨다.

**트리거:** 티켓 번호 언급, 페이지/화면/기능 개발·수정·검증 요청 시 `fillmap-page-dev` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-15 | 초기 구성 (에이전트 3 + 스킬 4 + vitest 셋업) | 전체 | - |
| 2026-07-15 | 티켓 description 템플릿 추가, 스펙 변환 시 템플릿 구조 활용 | docs/TICKET_TEMPLATE.md, skills/ticket-to-spec | 티켓 작성 표준화로 스펙 승인 질문 최소화 |
| 2026-07-15 | atlassian MCP 연결 — 티켓 번호만으로 지라 본문 조회 | skills/ticket-to-spec, skills/fillmap-page-dev | "MSG-xxx 진행해줘"만으로 파이프라인 시작 가능하게 |
| 2026-07-15 | 수술적 변경 원칙 추가 (범위 밖 코드 불간섭, 고아 정리, 기존 죽은 코드는 보고만) | skills/page-implementation | 외부 코딩 가이드에서 하네스에 없던 원칙만 선별 흡수 |
| 2026-07-21 | 컨벤션 정본 단일화 — 커밋 prefix 표를 훅 기준으로(design·hotfix→style·setting), 브랜치 타입 feat/fix/hotfix로 통일, PR 템플릿 플레이스홀더 정정, Node 고정(.nvmrc·engines), 리뷰 CI concurrency | README.md, skills/ticket-to-spec, .github, .nvmrc | MSG-163 하네스 감사 — 문서·훅·스킬 3원 불일치로 README 준수 커밋이 훅에 거부되는 함정 제거 |
| 2026-07-21 | tsconfig strict 명시(TS6 기본값이나 다운그레이드 대비), index.html lang=ko·서비스명 title | apps/web | MSG-163 — 감사 재검증에서 "non-strict" 지적은 철회됐고(TS6 기본 strict) 명시만 보강, 문서 메타는 a11y 결함 |
| 2026-07-21 | 검증 게이트를 전 패키지로 확장 — ui-web eslint 신설, 루트 lint/typecheck/test 스크립트, 검증 스킬 명령을 루트 기준으로 교체. 미사용 의존성 6종·죽은 lib/ 제거 | 루트·packages 설정, apps/web, skills/page-verification | MSG-163 — ui-web 컴포넌트 21개가 lint 0%·stories 20개가 typecheck 0% 커버였던 사각 해소 |
| 2026-07-21 | CI 게이트 신설 — PR(develop·main)·develop push 시 lint→typecheck→test→build→build-storybook, concurrency 취소 | .github/workflows/ci.yml | MSG-163 — 기계 게이트 없이 리뷰봇에만 의존하던 회귀 방지 공백 해소, 리뷰봇·사람은 화면 리뷰에 집중 |
| 2026-07-21 | 토큰 규칙 기계 강제 — 디자인 시스템 1조 재작성(px 임의값 전면 금지, 틀린 4px·예시 서술 정정), better-tailwindcss 린트 도입(한국어 메시지), 기존 정수 px 임의값 119건을 스케일 클래스로 일괄 치환 | docs/DESIGN_SYSTEM.md, README, 양쪽 eslint.config.js, apps/web·ui-web 소스 42파일 | MSG-163 — 검증 리포트가 기존 위반을 "선례"로 인용해 새 위반을 허용하던 침식 고리 차단. 치환은 px 고정→rem 추종(폰트 스케일 대응) 동작 변경 포함 |
| 2026-07-21 | RN 경계 기계 강제(no-restricted-imports/globals, model·스토어 glob) + 뷰-레이어 훅 예외 명문화 + FSD 표에 pages/{페이지}/ui/ 관례 추가 + zod 미도입 현실 반영 + 검증 명령 루트화 | apps/web/eslint.config.js, skills/page-implementation | MSG-163 — use-map-shell처럼 실무가 발명한 예외를 규칙으로 승격, 수동 grep 감사를 린터로 대체 |
| 2026-07-21 | 검증 스킬 재작성 — Figma 대조 단계, a11y 점검 4항목, WAIVED 판정값, 과잉 지적 억제 원칙, 스크린샷 미보존 명시 의무, 뷰 스모크 승격 판단 단계, 토큰/RN grep 감사를 lint 확인으로 대체 | skills/page-verification | MSG-163 — 스크린샷 6티켓 전부 미보존·WCAG 이슈를 리뷰봇이 발견하는 등 스킬-실무 괴리 해소. Figma 대조는 FIGMA_WORKFLOW 5단계를 검증 절차로 편입 |
| 2026-07-21 | 스펙 스킬에 Figma 분석 단계 신설(플레이스홀더 판별·오탐 방지 목록 작성) + 00_ticket.md 산출 주체를 analyst로 명시(주체 모순 해소) | skills/ticket-to-spec, agents/ticket-analyst | MSG-163 — MSG-120 스펙에서 실증된 우수 실무를 규칙화, 세션이 바뀌어도 유지되게 |
