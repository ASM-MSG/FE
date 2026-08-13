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
- `docs/retro/` — 티켓 회고 HTML (머지 후 요청 시 task-retro가 생성)
- `docs/HARNESS_CHANGELOG.md` — 하네스 전체 변경 이력 (아래 표에서 밀려난 행의 아카이브)

**변경 이력 (최근 5행 이내 — 전체는 `docs/HARNESS_CHANGELOG.md`, 밀려난 행은 그리로 이관):**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-08-13 | 검증 풀 게이트에 openapi-ts 드리프트 검사 추가(5종→6종), hey-api는 루트 devDep+TS ~6.0.3 peer로 이전 | skills/page-verification·page-implementation, agents 2종, package.json | MSG-386 CI 실패 환류 — CI에만 있던 드리프트 게이트가 검증 스킬에 없어 hey-api TS 7 비호환을 로컬이 못 잡음 (MSG-298 좌시프트 원칙 누락 보수) |
| 2026-08-13 | task-retro 스킬 신설 — 머지 후 요청 시 결정·트레이드오프 회고를 docs/retro/MSG-XXX.html로 생성 | skills/task-retro | MSG-380 — 회고 재료(기각 대안)는 작업 중 포착, 합성은 머지 후 온디맨드 |
| 2026-08-13 | 테스트 템플릿 신설 — 유형 선택 매트릭스(로직/스토어/쿼리 훅/스모크/흐름)와 단정 범위, test-first에 템플릿 선택 의무화, 검증 감사에 템플릿 부합 추가 | skills/page-implementation(+references/test-templates.md), skills/page-verification | MSG-380 — 템플릿 없는 TDD가 무의미 테스트를 양산(사용자 보고). Testing Trophy·공식 가이드 리서치 기반 |
| 2026-08-13 | 린트 강제 주체 서술 현행화 — eslint → oxlint(자작 토큰 플러그인 + 네이티브 규칙), 우회 감사를 lint 비활성 주석 일반형으로 | skills/page-implementation, skills/page-verification | MSG-386 — oxlint 단일화·TS 7.0.2 상향에 따른 문서-코드 동기화 |
| 2026-08-13 | 티켓 브랜치 생성 전 기존 브랜치(로컬·원격 `*MSG-{번호}*`) 조회 의무화 — 존재 시 사용자 브랜치가 정본, 없을 때만 생성+보고 | skills/fillmap-page-dev, skills/ticket-to-spec | MSG-386 사고 — 사용자 생성 브랜치를 조회 없이 두고 하네스가 임의 브랜치를 파서 갈라짐 |
