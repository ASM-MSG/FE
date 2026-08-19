# FillMap FE

pnpm 모노레포 — apps/web(React 19 + Vite) + apps/mobile(Expo, 대부분 스텁) + packages(design-tokens · tailwind-preset · ui-web · ui-native).

## 하네스: 지라 티켓 기반 페이지 개발

**목표:** 지라 티켓(MSG-xxx) 기획을 스펙 → 구현 → 검증 → 커밋으로 완주시킨다.

**트리거:** 티켓 번호 언급, 페이지/화면/기능 개발·수정·검증·리뷰 반영·PR/푸시 요청 시 `fillmap-page-dev` 스킬을 사용하라 — 이 트리거 범위에서는 외부 플러그인 스킬(브레인스토밍·PR 마무리류)보다 이 하네스가 우선한다. 머지된 티켓의 회고·정리 요청("MSG-xxx 회고 정리해줘", "결정/트레이드오프 정리")은 `task-retro` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

## 문서 지도

**항상 준수 (규칙):**
- `docs/DESIGN_SYSTEM.md` — 디자인 시스템 6개조 (토큰·재사용·RN 경계·FSD의 정본)
- `README.md` — 커밋 prefix · 브랜치 전략 · 검증 명령

**작업 전 확인 (현황):**
- `docs/STATUS.md` — **구현 현황의 단일 정본.** 코드베이스 탐색 전에 먼저 읽는다 (라우트·pages·features·entities·shared·ui-web 인벤토리 + 티켓당 한 줄 이력)
- `docs/spec/` — 티켓별 승인 스펙 + 작업 로그 (구현이 왜 이렇게 됐는지)

**필요 시 참조:**
- `DESIGN_SYSTEM_SPEC.md` — 구조 스펙 상세 · `docs/FIGMA_WORKFLOW.md` — Figma 노드 조회 절차
- `docs/TICKET_TEMPLATE.md` — 티켓 description 구조 · `docs/decisions/DECISIONS.md` — 결정 한 줄 로그
- `~/fillmaphtml/` — 티켓 회고 HTML (머지 후 요청 시 task-retro가 생성 — 레포 밖 개인 폴더, 커밋 안 함)
- `docs/HARNESS_CHANGELOG.md` — 하네스 전체 변경 이력 (아래 표에서 밀려난 행의 아카이브)

**변경 이력 (최근 5행 이내 — 전체는 `docs/HARNESS_CHANGELOG.md`, 밀려난 행은 그리로 이관):**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-08-19 | 모바일 런타임(Hermes) 미구현 API 차단 규칙 신설 — `apps/mobile`·`packages/ui-native` 한정 `no-restricted-properties`(`toSorted`·`toReversed`·`toSpliced`·`Object.groupBy`·`Map.groupBy`·`Promise.withResolvers`) + `no-restricted-globals`(`structuredClone`) | .oxlintrc.json | MSG-427 실기 사고 — 웹에서 포팅한 `toSorted` 3곳이 지도 홈을 마운트 즉시 크래시시켰는데 **게이트 6종이 전부 통과**했다(vitest는 Node에서 돌아 메서드가 존재하고, typecheck는 `lib`에 ES2023이 있다). 같은 함정이 `gallery-groups.ts`·`region-cluster-overlay.ts`에 두 번 주석으로 문서화돼 있었는데도 재발해, 주석으로는 못 막는 것이 실증됐다. 웹→모바일 포팅이 계속되는 한(MSG-428 등) 재발 창이 열려 있어 기계 게이트로 내린다 (MSG-298·386 좌시프트 원칙) |
| 2026-08-19 | e2e apt 미러 고정(azure→archive) + Playwright 설치 스텝 timeout-minutes 8 | .github/workflows/ci.yml | PR #74 실측 — `azure.archive.ubuntu.com` 불통으로 apt가 저장소마다 재시도하다 21분·14분+ 멈춤(2회 재현). `playwright install --with-deps`로 바꾸라는 조언은 같은 apt 경로를 타므로 무효였고, 캐시 히트 경로에서 바이너리 재다운로드만 추가된다. 미러리스트를 정본으로 고정해 재시도 구간을 제거하고, 그래도 물리면 빨리 실패하도록 타임아웃을 건다 |
| 2026-08-16 | pre-commit 링크드 워크트리 보정(GIT_DIR 오탐) + claude-review 완주 검증(SHA 마커·자기 수정 가드) | .husky/pre-commit, .github/workflows/claude-review.yml | MSG-403 사고 2건 — ① 워크트리에서 커밋 시 react-doctor가 루트 설정 전부를 불일치로 오탐, ② 리뷰 액션이 산출물 없이 종료해도 체크가 통과로 남아 미완 리뷰가 가려짐 |
| 2026-08-14 | 위임 불가 환경의 대체 경로 명문화 + 검증 리포트 pre-commit 기계 게이트 신설 | skills/fillmap-page-dev, .husky/pre-commit | MSG-395 사고 — 세션 정책이 Agent 도구를 막자 Phase 3(검증)이 통째로 누락된 채 커밋까지 감. 문서의 "생략 불가"만으로는 못 막아 훅으로 강제 |
| 2026-08-13 | 검증 풀 게이트에 openapi-ts 드리프트 검사 추가(5종→6종), hey-api는 루트 devDep+TS ~6.0.3 peer로 이전 | skills/page-verification·page-implementation, agents 2종, package.json | MSG-386 CI 실패 환류 — CI에만 있던 드리프트 게이트가 검증 스킬에 없어 hey-api TS 7 비호환을 로컬이 못 잡음 (MSG-298 좌시프트 원칙 누락 보수) |
