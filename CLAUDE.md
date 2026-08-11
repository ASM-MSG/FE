# FillMap FE

pnpm 모노레포 — apps/web(React 19 + Vite) + packages(design-tokens · tailwind-preset · ui-web). 디자인 시스템 규칙은 `docs/DESIGN_SYSTEM.md`(6개조), 구조 스펙은 `DESIGN_SYSTEM_SPEC.md`.

## 하네스: 지라 티켓 기반 페이지 개발

**목표:** 지라 티켓(MSG-xxx) 기획을 스펙 → 구현 → 검증 → 커밋으로 완주시킨다.

**트리거:** 티켓 번호 언급, 페이지/화면/기능 개발·수정·검증·리뷰 반영·PR/푸시 요청 시 `fillmap-page-dev` 스킬을 사용하라 — 이 트리거 범위에서는 외부 플러그인 스킬(브레인스토밍·PR 마무리류)보다 이 하네스가 우선한다. 단순 질문은 직접 응답 가능.

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
| 2026-07-21 | 오케스트레이터 보강 — 에이전트 모델 opus→fable(사용자 지시 "개발은 fable로만", revfactory 원칙 문구 일탈 기록), Phase 4에 PR 생성(검증 요약을 본문에)·잔여 항목 지라 코멘트 환류 추가. 에이전트 3종에 skills 프론트매터(스킬 기동 시 주입), verifier에 과잉 지적 억제·수정 금지 원칙 | skills/fillmap-page-dev, agents/* | MSG-163 — 파이프라인이 커밋에서 끝나 PR 인프라(템플릿·리뷰봇)와 단절, 후속 항목이 결정 기록에만 남아 유실되던 문제 해소 |
| 2026-07-21 | 업로드 위저드 흐름 스모크 4케이스 커밋 (7/15 뷰 테스트 비보존 결정의 부분 수정 — DECISIONS 기록) | apps/web features/upload | MSG-163 — 4연속 재작성·폐기되던 검증 하네스의 자산화, CI 회귀 보호 |
| 2026-07-21 | 최종 검증(warn 7) 반영 — 린트 강제 범위 정밀화(스페이싱·사이징만 기계 강제, 나머지 계열은 수동 감사 명시)·치환 건수 정정(119), 스모크 승격=코드 수정 금지의 명시적 예외·기록처를 검증 리포트로 정정, 에이전트 스킬 읽기 지시를 주입 전제로 완화, CLAUDE.md 트리거에 리뷰·PR 키워드+플러그인 우선순위, page-implementation 진입점 아님 명문화, README setting 누락 보완 | CLAUDE.md, README, docs/DESIGN_SYSTEM.md, skills 3종, agents 3종 | MSG-163 — 구조·트리거·적대 리뷰 3중 검증에서 발견된 문서 간 불일치 해소 (blocker 0) |
| 2026-07-21 | Phase 4 커밋 주체 변경 — 하네스는 스테이징+커밋 메시지 초안까지, `git commit` 실행은 사용자 직접 (명시 위임 시에만 하네스 실행) | skills/fillmap-page-dev | 사용자 결정 — 커밋은 본인이 이해하고 서명한 변경이어야 함. 검토 강제 + 단계별 커밋 granularity 유지 절충 |
| 2026-07-29 | 단순성 우선(Simplicity First) 원칙 추가 — 스펙 밖 기능·성급한 추상화·발생 경로 없는 방어 코드·불필요한 라이브러리 도입 금지. 필수 규칙(RN 경계·토큰·FSD)이 요구하는 간접화는 예외로 명시(경계 규칙 우선) | skills/page-implementation | 카파시 4원칙 대조 감사 — 수술적 변경·모호점 질문·수용 기준 루프는 기존 규칙이 커버하나 단순성 우선만 공백. revfactory 하네스는 구조 원칙만 다뤄 행동 원칙은 별도 흡수 필요 |
| 2026-07-29 | TDD 침식 방지 보강 — test-first에 RED 실행 확인 단계 신설(보존 단정 예외 명문화, 빌드 리포트에 RED 열), 검증 규칙 감사에 테스트 무결성 항목(기존 테스트 약화·skip·삭제·특수분기 diff 감사), 버그 수정·리뷰 반영 특칙(로직 결함은 재현 실패 테스트 먼저), 이전 티켓 테스트 불변 원칙 | skills/page-implementation, skills/page-verification, agents/page-builder | TDD 하네스 리서치(6각도 웹 조사+적대 검증) — RED 미확인 테스트는 가짜 GREEN을 못 막고(리포트 기록 비일관 실증), 재작업 루프의 기존 테스트 약화 경로에 규칙·감사 부재(ImpossibleBench 실측상 Claude 계열 주 게이밍 전술이 테스트 수정), 리뷰 반영 흐름에 test-first 공백(MSG-46 후속·MSG-125 실무의 규칙 승격) |
| 2026-07-29 | vitest allowOnly:false 명시 | apps/web/vite.config.ts | allowOnly 기본값이 !CI라 로컬 pnpm test(빌더 완료 조건·검증 1단계)만 .only 잔류를 허용 — CI와 게이트 동작 통일 |
| 2026-07-29 | 리뷰 반영 — 테스트 재설계 후 RED 재확인 루프백 명시, 테스트 파일 이동·리네임은 삭제 감사 예외, RED 리터럴 표기 통일 | skills/page-implementation, skills/page-verification | 리뷰 지적 — 재설계 경로만 RED 게이트를 우회할 여지, 리네임의 삭제 오판(과잉 지적 억제 정합), 표기 불일치 |
| 2026-07-29 | 지도 격리 규칙을 네이버 SDK 기준으로 갱신 (react-kakao-maps-sdk → react-naver-maps, 경계 파일명·줌 의미 체계 명시) | skills/page-implementation | MSG-254 지도 SDK 마이그레이션 — 검증 환류에서 발견된 하네스 문서-코드 불일치 해소 |
| 2026-08-11 | react-doctor pre-commit을 React 패키지(web·mobile·ui-web·ui-native)별 실행으로 재작성 — 루트 단일 실행은 react 의존성 부재로 React 전용 규칙이 통째로 꺼진 가짜 그린이었음 (같은 스테이징이 루트 exit 0 / apps/web exit 1로 실증) | .husky/pre-commit | MSG-329 — exhaustive-deps·lazy-ref 등 React 규칙 경고가 PR 리뷰에서야 드러나던 좌시프트 공백 해소 |
| 2026-08-05 | CI 전용이던 포맷·중복 게이트를 로컬로 전진 — pre-commit에 format:check, pre-push에 check:duplication(신설), 검증 스킬 자동 게이트에 두 명령 추가 | .husky, skills/page-verification | MSG-298 — MSG-297에서 신설된 CI 게이트 2종이 로컬 훅·검증 스킬에 없어 push 후 CI에서야 실패가 드러남. 커밋(포맷)·push(중복) 시점으로 좌시프트 |
