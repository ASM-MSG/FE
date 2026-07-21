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
