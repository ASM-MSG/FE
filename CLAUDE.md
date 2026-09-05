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
| 2026-09-04 | 모바일 런북 **1-D 두 번째 에뮬레이터 병렬 실기** 신설(AVD 2대 + Metro 8082 + APK `pull/install -r` 이식 + `.env` 복사 + 앱 dev 메뉴 "Change Bundle Location" `10.0.2.2:8082`), 4절 8081 고정 문구에 우회 경로 추가 | docs/MOBILE_RUNBOOK.md | MSG-572 — 검증 시 `emulator-5554`·8081 Metro가 다른 세션(MSG-571 체크아웃) 것이라 재사용하면 그쪽 실기를 끊는다. 2026-09-02 시간 예산 행이 "직렬 해소(두 번째 AVD + `adb reverse`)는 미실측"으로 남긴 경로를 실측했고 **reverse 가설은 반증됐다**: RN 디버그 호스트 기본값이 `10.0.2.2:8081`(호스트 루프백)이라 reverse를 우회해 타 세션의 8081 번들(develop 코드)을 조용히 실행했고, 새 카드가 안 보이는 것을 코드 결함으로 오독할 뻔했다(진단 7분, 실기 23분으로 15분 상한 초과). 해법은 dev 메뉴 번들 주소 변경. APK는 기존 AVD에서 `adb pull`로 1초에 이식돼 재빌드 0. 워크트리 `.env`가 gitignore라 비어 부트 throw가 나는 것도 새 함정 |
| 2026-09-04 | 모바일 런북 **함정 11(다른 워크트리의 Metro)** 신설 — 넘겨받은 Metro 8081은 `lsof -p <pid> \| grep cwd`로 cwd를 먼저 확인하고, 다르면 죽이고 이 레포에서 재기동 | docs/MOBILE_RUNBOOK.md | MSG-567 — 오케스트레이터가 "Metro 8081 가동 중"으로 검증자에게 넘겼는데 그 Metro는 `FE-MSG-558` 워크트리(머지된 MSG-565)에서 돌고 있었다. 첫 콜드 스타트가 옛 번들(삭제한 블러 카드가 그대로)을 받아 검증자가 원인을 찾는 데 실기 시간을 썼다. 워크트리를 여러 개 쓰는 지금 구조에서 포트 점유 = 이 레포의 Metro가 아니다 |
| 2026-09-04 | 모바일 런북 **함정 10(에뮬레이터 핀치 줌 — `adb root` + `sendevent` 멀티터치)** 신설 + `apps/mobile/scripts/emu-pinch.sh` 추가 | docs/MOBILE_RUNBOOK.md, apps/mobile/scripts | MSG-566 — 줌아웃 클러스터 마커가 커스텀 스타일 위에 그려지는지가 수용 기준인데 `adb shell input`이 단일 포인터라 1차 실기에서 "미실행(범위 축소)"로 빠졌다. 사용자: "에뮬레이터로 해보셈" — 물리 기기 없이도 닫을 수 있어야 한다. 실측으로 두 단계에서 막혔다: 일반 셸은 `/dev/input` 쓰기 불가(`adb root` 필요), root 뒤에도 virtio 장치가 `BTN_TOUCH` 없이 `BTN_STYLUS`만 노출해 툴타입 0·압력을 명시해야 손가락 제스처로 잡힌다(함정 9 스타일러스 오인과 같은 뿌리). 줌 단이 달라야 보이는 기준(클러스터·집계 층·`GRID_MIN_ZOOM` 경계)은 map-home 티켓마다 반복되므로 스크립트로 굳힌다 |
| 2026-09-03 | PR 본문 "📸 스크린샷" 임베드 방식을 **GitHub 직접 업로드(user-attachments URL)** 로 확정 — 같은 날 신설된 orphan 브랜치 `pr-assets` raw URL 절차를 대체 | skills/fillmap-page-dev | MSG-559 PR #126 — 사용자: "아니 이렇게 하지 마. 그냥 github에 직접 업로드 하는 방식으로 해". 브랜치 방식은 레포에 이미지 커밋이 남고 워크트리·orphan 체크아웃 절차가 붙는다. 직접 업로드는 Claude in Chrome `file_upload` → URL 추출 → `gh pr edit`로 끝나며 레포에 흔적 0(#126 실사용) |
| 2026-09-03 | (대체됨) PR 본문 "📸 스크린샷" 섹션에 **검증 스크린샷을 실제 이미지로 임베드**하는 절차 신설 — orphan 브랜치 `pr-assets`의 `MSG-{번호}/*.png`를 `blob/pr-assets/…?raw=true`로 `<img>` 표 첨부 + AC 캡션 | skills/fillmap-page-dev | MSG-560 — 558·560 PR이 연속으로 스크린샷 섹션을 비우고 "`_workspace/…/screenshots/`에 있음(gitignore)"으로 빠져나갔다. 사용자: "자꾸 스크린샷(선택)에 왜 안 넣고 따로 빼는 건데, 패치하면 되잖아". 리뷰어는 워크스페이스를 볼 수 없어 검증 리포트 표를 본문에 붙이는 것과 같은 이유가 스크린샷에도 그대로 적용된다 — 6장 캡처하고도 PR에서 보이지 않으면 실기 검증의 증거 가치가 0이다. GitHub는 CLI용 이미지 업로드 API가 없어 저장소 안 orphan 브랜치가 가장 싼 호스팅(공개 저장소라 raw URL 렌더) |
