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
- `docs/MOBILE_RUNBOOK.md` — 모바일 실기 검증 절차 (dev client 빌드·기기 연결·함정 대응) — **apps/mobile 티켓 검증 시 필수**, 진입점은 page-verification 절차 3-B
- `docs/TICKET_TEMPLATE.md` — 티켓 description 구조 · `docs/decisions/DECISIONS.md` — 결정 한 줄 로그
- `~/fillmaphtml/` — 티켓 회고 HTML (머지 후 요청 시 task-retro가 생성 — 레포 밖 개인 폴더, 커밋 안 함)
- `docs/HARNESS_CHANGELOG.md` — 하네스 전체 변경 이력 (아래 표에서 밀려난 행의 아카이브)

**변경 이력 (최근 5행 이내 — 전체는 `docs/HARNESS_CHANGELOG.md`, 밀려난 행은 그리로 이관):**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-08-28 | react-doctor `js-tosorted-immutable` 규칙 off 선언 + **규칙 설정이 v0.9.3 스캐너에 안 먹는다는 실측 기록** | doctor.config.json, CLAUDE.md | MSG-488 PR #104 리뷰 — **두 도구가 정반대를 지시하고 있었다**: react-doctor는 `[...arr].sort()`를 `toSorted()`로 바꾸라 하고, `.oxlintrc.json:84`는 `toSorted`를 error로 금지한다(Hermes 미구현 — MSG-427에서 지도 홈을 마운트 즉시 크래시시킨 그 API). oxlint 금지가 `apps/mobile`·`packages/ui-native` 한정이라 **웹 파일에서는 react-doctor만 말하고 게이트 6종이 아무것도 안 잡는다**. 비용은 실측된다: 웹 프로덕션 `toSorted` 6곳 중 모바일 이식본이 있는 **5곳 전부**가 손으로 `[...].sort()`로 되돌려져 Hermes 주석을 달고 있고(`hot-region-summary`·`course`·`use-multi-grid-videos-query`·`region-cluster-overlay`·`gallery-groups`), 뒤 둘은 MSG-427 사고로 지목된 바로 그 파일들이다(주석 2회로도 못 막혔던 자리). 지적 대상 `route-legs.ts:6`은 스스로 `(RN 재사용 대상)`이라 선언한다. 규칙의 근거도 사실과 다르다 — `toSorted()`도 새 배열을 할당하므로 "복사 없이 정렬"이 아니다. **단, 이 설정은 현재 무효다(실측)**: v0.9.3에서 `rules list`·`rules explain`은 `off`로 보고하고 공식 `react-doctor rules disable`이 쓴 것도 같은 내용인데, 스캐너는 규칙을 그대로 보고한다(레포 루트·`apps/web` cwd 양쪽, `ignore.tags`도 동일하게 무시). **기존 `js-combine-iterations: off`도 같은 이유로 무효였다.** 따라서 실효 방어선은 이 행의 기록이고, 설정은 도구가 고쳐지면 자동으로 듣도록 선언만 남긴다. **후속 후보**: oxlint 금지를 레포 전역으로 승격하면 이식 세금이 원천 제거되나 기존 웹 6곳 수정이 따르므로 별도 티켓 |
| 2026-08-24 | claude-review 완주 검증 판정을 **PR 코멘트 마커 grep → 액션 execution output 3단 판정**(① 파일 존재 → ② 마지막 result `is_error=false && subtype=success` → ③ 게시 도구 호출 증거: `gh pr comment` Bash 또는 `update_claude_comment`)으로 교체, 마커는 warning 강등(프롬프트 지시 존치·1줄 보정), 실패 사유별 구분 `::error::`+실측값 출력 | .github/workflows/claude-review.yml | MSG-465 — PR #89 af67beb 오탐: 리뷰가 정상 완주했는데 봇이 진행 코멘트에 요약을 이어 붙이며 SHA 마커를 생략해 검증 스텝이 실패 표시. 판정이 봇의 그때그때 코멘트 작성 방식에 좌우되던 것을 액션 산출물(전사) 기준으로 분리 — MSG-403 원 사고(정상 종료·요약 미게시, `is_error=false`·`num_turns=17` 실측이라 result 판정만으론 통과)는 ③ 게시 증거가 계속 잡는다. 잔여 창(체크리스트만 갱신 후 침묵 종료)은 마커 warning으로 관찰, 재발 실측 시 후속 조임 |
| 2026-08-21 | codex 리뷰 **실행 경로를 Bash companion 하나로 확정** + 시점을 커밋 직전 → **push 전**으로 이동 | skills/fillmap-page-dev | MSG-451 사고 — 종전 문구가 "`/codex:review` **또는** companion 서브커맨드"로 두 경로를 동등 나열해 세션마다 선택이 갈렸다. 8/17~19 세션은 companion으로 정상 실행했으나(워크트리 state 실측 15건), 이번 세션은 슬래시 커맨드를 시도했다가 `disable-model-invocation`에 막히자 **그대로 건너뛰어 커밋 4개가 리뷰 없이 진행**됐다. 선택지를 주면 막힌 쪽을 고른 세션이 스킵한다 — 명령줄을 스킬에 그대로 박았다. 시점은 커밋이 로컬이라 되돌리기 싸고 중간 커밋 리뷰가 곧 폐기될 코드를 반복해 보기 때문(MSG-451은 뒤 커밋이 앞 결정을 뒤집었다). **조사 과정 교훈**: 메인 레포 state만 보고 "8/13 이후 리뷰 0건"으로 단정했다가 워크트리별 state에서 15건을 발견해 정정 — 워크트리 병렬 작업에서는 저장소 단위 상태가 흩어진다 |
| 2026-08-21 | 검증 스킬 실동작 경로를 **대상 앱**으로 분기 — 3-A(웹 브라우저) / 3-B(모바일 Android dev client) 신설, 모바일 확인불가 판정 기준·리포트 형식 명문화, 실기 런북(`docs/MOBILE_RUNBOOK.md`)과 원커맨드 스크립트(`pnpm --filter mobile android:dev`) 신설 | skills/page-verification, skills/fillmap-page-dev, docs/MOBILE_RUNBOOK.md, apps/mobile/scripts | MSG-449 — 절차 3이 `pnpm dev` + 브라우저로만 쓰여 있어 모바일 티켓에 대응 절차가 없었고, 웨이브 0~3(MSG-419~431)이 전부 정적 게이트(vitest·typecheck·lint)만으로 통과했다. 2026-08-20 실기 시도에서 함정 6가지(임베디드 번들 로더·스킴 충돌·8081 콜드 스타트 복귀·페어링 포트 만료·`--device`는 모델명·새 네이티브 의존성 prebuild)에 순차로 걸렸는데 전부 재발할 문제라 문서가 아니라 검증 경로 자체로 내린다. 후속 모바일 티켓이 이 절차로 검증한다 |
| 2026-08-19 | 모바일 런타임(Hermes) 미구현 API 차단 규칙 신설 — `apps/mobile`·`packages/ui-native` 한정 `no-restricted-properties`(`toSorted`·`toReversed`·`toSpliced`·`Object.groupBy`·`Map.groupBy`·`Promise.withResolvers`) + `no-restricted-globals`(`structuredClone`) | .oxlintrc.json | MSG-427 실기 사고 — 웹에서 포팅한 `toSorted` 3곳이 지도 홈을 마운트 즉시 크래시시켰는데 **게이트 6종이 전부 통과**했다(vitest는 Node에서 돌아 메서드가 존재하고, typecheck는 `lib`에 ES2023이 있다). 같은 함정이 `gallery-groups.ts`·`region-cluster-overlay.ts`에 두 번 주석으로 문서화돼 있었는데도 재발해, 주석으로는 못 막는 것이 실증됐다. 웹→모바일 포팅이 계속되는 한(MSG-428 등) 재발 창이 열려 있어 기계 게이트로 내린다 (MSG-298·386 좌시프트 원칙) |
