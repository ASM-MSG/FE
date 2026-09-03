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
| 2026-09-03 | PR 본문 "📸 스크린샷" 임베드 방식을 **GitHub 직접 업로드(user-attachments URL)** 로 확정 — 같은 날 신설된 orphan 브랜치 `pr-assets` raw URL 절차를 대체 | skills/fillmap-page-dev | MSG-559 PR #126 — 사용자: "아니 이렇게 하지 마. 그냥 github에 직접 업로드 하는 방식으로 해". 브랜치 방식은 레포에 이미지 커밋이 남고 워크트리·orphan 체크아웃 절차가 붙는다. 직접 업로드는 Claude in Chrome `file_upload` → URL 추출 → `gh pr edit`로 끝나며 레포에 흔적 0(#126 실사용) |
| 2026-09-03 | (대체됨) PR 본문 "📸 스크린샷" 섹션에 **검증 스크린샷을 실제 이미지로 임베드**하는 절차 신설 — orphan 브랜치 `pr-assets`의 `MSG-{번호}/*.png`를 `blob/pr-assets/…?raw=true`로 `<img>` 표 첨부 + AC 캡션 | skills/fillmap-page-dev | MSG-560 — 558·560 PR이 연속으로 스크린샷 섹션을 비우고 "`_workspace/…/screenshots/`에 있음(gitignore)"으로 빠져나갔다. 사용자: "자꾸 스크린샷(선택)에 왜 안 넣고 따로 빼는 건데, 패치하면 되잖아". 리뷰어는 워크스페이스를 볼 수 없어 검증 리포트 표를 본문에 붙이는 것과 같은 이유가 스크린샷에도 그대로 적용된다 — 6장 캡처하고도 PR에서 보이지 않으면 실기 검증의 증거 가치가 0이다. GitHub는 CLI용 이미지 업로드 API가 없어 저장소 안 orphan 브랜치가 가장 싼 호스팅(공개 저장소라 raw URL 렌더) |
| 2026-09-02 | 모바일 실기 검증(3-B) **시간 예산** 신설 — 핵심 사용자 경로 1회 통과 + 상태별 스크린샷 1장(≤6장) + 실기 15분 상한. 경로 밖 화면 기준은 vitest 매핑 또는 "미실행(범위 축소)"로 표기해 확인불가(환경 요인)와 구분. 실기 중 생성물 재생성·`git stash`/`checkout`·워크스페이스 루트 심링크 금지, `-- --skip-build` 표기 오류를 `--skip-build`로 정정 | skills/page-verification | MSG-556~558 병렬 웨이브 — 마커 하나 바꾼 MSG-558 검증이 **64분·스크린샷 32장**까지 갔다. 스펙이 화면 기준 10~15개를 뽑고 검증자가 기준마다 adb 조작→스크린샷→이미지 읽기를 반복한 것이 본체이고, 오케스트레이터 실수 2건(pnpm이 `--`를 스크립트에 그대로 넘겨 Metro 기동 실패 · 워크트리 루트에 만든 `_workspace` 심링크가 Metro 파일 맵을 `TreeFS` 크래시로 죽임)이 실기를 두 번 끊었으며, 워크트리에서 돌린 openapi-ts 재생성이 삭제 창에 번들 요청을 걸어 해석 오류를 냈다. 에뮬레이터 1대에 3티켓 직렬이라 대기까지 누적. 사용자: "이렇게 오래 걸리는 게 맞아? 다 필요한 과정이야?" — 실기의 증거 가치는 핵심 경로 통과 1회에 대부분 들어 있고, 기준별 탐색은 비용만 늘린다. 직렬 해소(두 번째 AVD + `adb reverse tcp:8081 tcp:8082`)는 미실측이라 후속 |
| 2026-08-29 | 웹 실동작 검증(3-A)에 **탭 가시성·rAF 프레임률 전제 조건** 신설 — 계측형 기준이 있으면 `document.visibilityState`와 rAF 표본을 먼저 실측하고, 숨은 탭에서 잰 숫자는 버리고 다시 잰다 | skills/page-verification | MSG-489 후속 — 브라우저 자동화 탭이 백그라운드였고 rAF가 **0.5~1fps로 정지**해 있었다. 같은 줌 전이가 숨은 탭 11,162ms · 전면 탭 316ms로 **35배** 부풀려졌고, 그 값이 "정규화 대기 14.2초 무피드백"이라는 리포트 문장과 후속 티켓 권장까지 만들어 냈다. 더 나쁜 것은 **동작 자체가 달라진다**는 점이다 — 숨은 탭에서는 네이버 지도가 `idle`을 내지 않아 뷰포트 스토어가 옛 값에 머물고, 그 상태에서 D13 타임아웃이 발화해 정규화되지 않은 뷰포트(1.9°×4.7°)로 요청이 나가 서버 400(14401)이 재현됐다. 즉 오염된 계측이 실제 결함을 가리고 있었다. 계측 신뢰성은 검증자 개인의 주의력이 아니라 절차의 전제 조건으로 내린다 |
| 2026-08-28 | react-doctor `js-tosorted-immutable` 규칙 off 선언 + **규칙 설정이 v0.9.3 스캐너에 안 먹는다는 실측 기록** | doctor.config.json, CLAUDE.md | MSG-488 PR #104 리뷰 — **두 도구가 정반대를 지시하고 있었다**: react-doctor는 `[...arr].sort()`를 `toSorted()`로 바꾸라 하고, `.oxlintrc.json:84`는 `toSorted`를 error로 금지한다(Hermes 미구현 — MSG-427에서 지도 홈을 마운트 즉시 크래시시킨 그 API). oxlint 금지가 `apps/mobile`·`packages/ui-native` 한정이라 **웹 파일에서는 react-doctor만 말하고 게이트 6종이 아무것도 안 잡는다**. 비용은 실측된다: 웹 프로덕션 `toSorted` 6곳 중 모바일 이식본이 있는 **5곳 전부**가 손으로 `[...].sort()`로 되돌려져 Hermes 주석을 달고 있고(`hot-region-summary`·`course`·`use-multi-grid-videos-query`·`region-cluster-overlay`·`gallery-groups`), 뒤 둘은 MSG-427 사고로 지목된 바로 그 파일들이다(주석 2회로도 못 막혔던 자리). 지적 대상 `route-legs.ts:6`은 스스로 `(RN 재사용 대상)`이라 선언한다. 규칙의 근거도 사실과 다르다 — `toSorted()`도 새 배열을 할당하므로 "복사 없이 정렬"이 아니다. **단, 이 설정은 현재 무효다(실측)**: v0.9.3에서 `rules list`·`rules explain`은 `off`로 보고하고 공식 `react-doctor rules disable`이 쓴 것도 같은 내용인데, 스캐너는 규칙을 그대로 보고한다(레포 루트·`apps/web` cwd 양쪽, `ignore.tags`도 동일하게 무시). **기존 `js-combine-iterations: off`도 같은 이유로 무효였다.** 따라서 실효 방어선은 이 행의 기록이고, 설정은 도구가 고쳐지면 자동으로 듣도록 선언만 남긴다. **후속 후보**: oxlint 금지를 레포 전역으로 승격하면 이식 세금이 원천 제거되나 기존 웹 6곳 수정이 따르므로 별도 티켓 |
