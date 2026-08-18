# Implementation Status — 지금 코드에 실제로 있는 것

> **이 문서가 FE 구현 현황의 단일 정본이다.** 에이전트(analyst·builder·verifier)는 코드베이스를
> 탐색하기 전에 이 문서를 먼저 읽는다 — 여기 없는 것만 소스에서 확인한다.
> 상태 기준: `develop` 최신 (머지되는 PR이 자기 티켓 줄을 함께 갱신하므로 별도 날짜 관리 없음).
>
> **갱신 규칙:** 티켓 완료 시(파이프라인 Phase 4) 변경된 섹션 끝에 `MSG-XXX: 한 줄` 불릿을
> append하고 스테이징에 포함한다. 한 줄에 여러 티켓을 잇지 않는다(병렬 PR 충돌 방지).
> 구조 변경(디렉토리 신설·이동)은 해당 섹션 본문도 함께 고친다.
> 초판(2026-08-13, MSG-380)은 현재 스냅숏이며 과거 티켓 이력은 소급하지 않는다.

## 라우트 (apps/web/src/app/)

정의 정본: `app/routes.ts`(`ROUTES`·`NavKey`·`getActiveNavKey`), 등록: `app/router.tsx`(createBrowserRouter).

| 경로 | 컴포넌트 | 비고 |
|---|---|---|
| (root) | `AppLayout` | 사이드레일 + Outlet + UploadModal/LoginModal/UploadProcessingNotices/PushNoticeHost(MSG-408) 상주 + 위치동의 게이트(로그인 && `locationConsent=false`면 셸 대신 `LocationConsentScreen` 전면 렌더 — MSG-407) |
| (error) | `RouteErrorBoundary` | 렌더·로더 오류 + 404 수렴 (MSG-325) |
| (layout) | `MapShell` | 전 네비 섹션 공유 지속 지도 셸 |
| `/` | `MapHomePage` | 지도 홈 (검색·지역 격자 패널 포함 — MSG-328에서 탐색 흡수) |
| `/upload` | `SectionPanel` 스텁 | 실제 업로드는 모달 |
| `/dex/:tab?` | `RequireAuth > DexPanel` | 탭이 URL 정본 (`/dex`·`/dex/badges`), 비로그인 시 홈+로그인 모달 (MSG-328) |
| `/profile` | `RequireAuth > ProfilePanel` | 로그아웃 시 홈+로그인 모달 |
| `/oauth/kakao/callback` | `KakaoCallbackPage` | 셸 밖 라우트 (MSG-325) |

로그인 라우트 없음 — `LoginModal`로 처리. 기타 app/: `QueryProvider`, `RequireAuth`, `configure-auth.ts`(shared 파이프라인↔auth 스토어 배선).

## pages/ (4)

- **map-home** — `MapHomePage` + ui/: `MapCanvas`(네이버 지도+오버레이), `MapControls`, `RegionPanel`(기본 분기 — 행정동 헤더+격자 카드 리스트+전체 지역 모드+비로그인 로그인 유도), `RegionGridCard`, `RegionListView`, `RegionReloadButton`("{행정동} 장소 불러오기" 재검색 pill), `HomeSearchBox`(장소·격자 검색+인기 검색어 드롭다운 — 격자 섹션은 MSG-412, 선택 시 이동+`emphasizeCell` 하이라이트), `RetryNotice`(실패+재시도 행 공용), `CellActionRow`, `HomeCellDetailPanel`, `FeedVideoCard`, `FeedVideoList`(격자 상세·테마 피드 공용), `ThemeChip`/`ThemeChipsBar`/`ThemeFeedPanel`, `naver-sdk-loader.ts`(SDK 격리 경계), `use-escape-close.ts`, `use-home-entry-lifecycle.ts`
- **dex** — `DexPanel` + ui/: `DexProfileHeader`, `DexStatCards`, `DexTabs`, `RegionProgress`, `RecentRegionRow`(동 단위 행), `BadgeTabBody`, `BadgeMedal`(메달 아트), `GalleryTabBody`(격자 그룹+1열), `GalleryVideoCard` · 스모크 공용: `dex-fetch-stub.ts`, `dex-test-harness.tsx`
- **profile** — `ProfilePanel` + ui/: `ProfileHeader`, `ActivityCard`, `SettingRow`, `SettingToggleRow`(ui-web Switch 행 — "알림 받기", MSG-408)
- **oauth-callback** — `KakaoCallbackPage` (ui/ 없음)

## widgets/ (5)

- **map-shell** — `MapShell`(지도 인스턴스 라우트 전환 유지), `SidebarCollapseHandle`, `use-map-shell.ts`(지도 명령 API, 뷰-레이어 훅), `map-overlay-store.ts`, `sidebar-store.ts`, `grid-click-routing.ts`(순수 함수, RN 재사용 대상)
- **cell-detail** — `CellDetailSheet`, `CellMoreMenu`(Radix DropdownMenu) · model/: `cell-detail`, `cell-detail-store` (MSG-328에서 구 features/explore로부터 이동 — 소비처가 이 위젯과 pages/dex뿐). `ReportDialog`·`ReportReasonSelect`·`model/report`는 MSG-411에서 features/video-actions로 이동. 주의: CellDetailSheet·CellMoreMenu는 현재 어느 라우트에서도 미렌더(MSG-327/328 배선 누락 — 존치 결정, 정리는 후속 판단)
- **video-mini-panel** — `VideoMiniPanel`(실 재생 + 헤더 더보기(⋯) mine 분기 — 내 영상: 공개·삭제 / 타인: 신고, MSG-411), `VideoOwnerMeta` (MSG-327에서 pages/map-home으로부터 이동 — 홈·도감 공용, pages→pages import 회피)
- **section-panel** — `SectionPanel`(네비 섹션 공통 388px 패널)
- **side-rail-nav** — `SideRailNav`(ui-web `SideRail` 라우터 연결 + 활성 탭 재클릭 2단), `rail-action`(초기 상태 판정·재클릭 동작 순수 함수)

## features/ (9 도메인)

- **auth** — model: `auth-store`(팩토리), `kakao-oauth`, `login-modal-store` · api: `use-auth-mutations` · ui: `LoginModal`, `LoginContent`, `KakaoLoginButton`, `DevLoginPanel`
- **dex** — model: `dex-summary`(clampPct·탐험 규모 문구), `recent-regions`(격자→동 묶음), `gallery-groups`(동 영상→격자 그룹), `video-new`(NEW 24h), `badge-showcase`(진열장 정렬), `region-label`(행정동명 축약·수집률 표기), `dex-tab`, 스토어 `gallery-region-store`(동+대표 격자)·`recent-removal-store`, 쿼리 `use-collection-query`(summary·grids·badges)·`use-region-videos-query`·`use-region-stat-query`(by-grid 코드 조인·by-point 수집률) · api/·ui/ 없음(UI는 pages/dex)
- **region** — model: `region-panel-store`(확정 지역 + **확정 영역(bounds)** + 패널 모드), `region-reload`(재검색 버튼 노출 판정 순수 함수), `use-committed-region`(확정 최초 채택 — 셸이 마운트), `grid-card`(격자명 조합·격자 중심 좌표), `gated-query-status`(인증 게이트 쿼리 공용 상태 파생), 쿼리 훅 `use-reverse-geocode-query`(중심 좌표 디바운스 500ms)·`use-region-grids-query`(sort=LATEST·limit=20)·`use-explore-regions-query` · ui/ 없음(UI는 pages/map-home)
- **search** — model: `use-place-search-query`(디바운스 300ms+searchNow), `use-trending-query` · MSG-412 신설: `zone-search`(격자 검색 순수 — parseGridQuery·matchZones·zoneCellToGridId(A=북단·1=서단 역산)·zoneBounds·zoomForGridFocus, RN 재사용 대상), `use-zones-query`(로그인 게이트 + staleTime/gcTime Infinity 세션 1회), `use-grid-search`(입력→매치 파생, 로컬 필터라 디바운스 없음) · ui/ 없음(UI는 pages/map-home HomeSearchBox)
- **map-home** (최대 도메인) — 오버레이/기하: `grid-overlay`, `occupied-grid-overlay`(EPSG:5179), `cluster-overlay`, `theme-overlay`, `grid-label`, `map-scale` · 도메인: `theme`, `theme-feed`, `home-cell-detail`, `grid-videos`, `video-playback`, `viewport-query`, `map-query-policy` · 스토어: `viewport-store`(플랫폼 중립), `theme-filter-store`, `home-cell-detail-store`, `video-mini-panel-store` · 쿼리 훅: `use-occupied-grids-query`·`use-hotzones-query`(비로그인 미발사 — 인증 게이트, MSG-328), `use-grid-detail-query`, `use-grid-videos-query`, `use-video-playback-query`, `use-grid-card-play`(격자 카드 클릭 → 상세 미오픈·지도 이동 없이 첫 영상 미니 패널 재생 + 재생 격자 테두리 강조 수명) · MSG-403 신설: `chip-zoom`(칩→진입 줌 단)·`occupancy-visibility`(칩 활성 중 점령 층 억제)·`use-chip-entry`(줌 이동+1회 확정)·미션 서버 API 훅 3종(`use-mission-progress-query`·`use-mission-detail-query`·`use-mission-videos-query`) · MSG-410 신설: `aggregation-unit`(zoom→집계 unit 축척 표 역산·bbox span 클램프·드릴다운 줌)·`region-cluster-overlay`(집계 items→마커 파생·시도명 축약·픽셀 겹침 병합)·`use-grid-aggregation-query`(저줌 집계 — bbox는 **뷰포트**, 확정 영역 정본의 명시적 예외), `cluster-overlay`는 FE 클러스터 산술 삭제 후 `gateFillCells`만 잔존 · ui/ 없음(UI는 pages/map-home)
- **notifications** (MSG-408 신설) — config: `firebase`(Firebase config·VAPID 공개키 상수 정본 — VITE_ env 예외, 사용자 승인 2026-08-17) · model: `push-support`(지원 판별 순수), `push-sync`(재등록/로테이션 전이 + SW URL 조립 순수), `push-toggle`(토글 표시 파생 순수 — granted && 보관 토큰), `push-token-store`(보관 토큰 반응형, 저장 계층 `shared/storage.fcmTokenStorage`), `push-notice-store`(토글 denied/error 안내 단일 슬롯 — PR #60 리뷰 3) · api: `messaging`(firebase 동적 import 격리 경계 — 테스트 모킹 지점), `use-push-token-sync`(셸 상주 자동 동기화 — 기존 등록자 한정), `use-push-toggle`(프로필 토글 ON/OFF — 신규 등록 유일 진입점), `use-foreground-messages`(onMessage → 통지) · ui: `PushNoticeHost`(AppLayout 셸 분기 상주 — 동기화 배선 + 포그라운드·토글 안내 우하단 단일 스택). SW: `public/firebase-messaging-sw.js`(config는 쿼리스트링 전달, gstatic CDN compat)
- **profile** — model: `profile-edit`, `profile-format`, `profile-modal-store`(모달 열림 — 사이드레일 초기화가 읽는다), `profile-image`(업로드 순수 로직), `upload-profile-image`(오케스트레이션 포트), `use-profile-image-upload`(웹 포트 훅), `use-profile-query`, `location-consent`(게이트 판정 순수 — RN 재사용 대상)·`use-location-consent-gate`(MSG-407) · api: `use-profile-mutations`(닉네임·위치동의 PUT·이미지 DELETE) · ui: `ProfileEditModal`, `DeleteAccountModal`, `LocationConsentScreen`(전면 동의 화면 — AppLayout 조건 렌더, MSG-407)
- **video-actions** (MSG-411 신설) — model: `video-menu`(공개 옵션 2종·shouldPatchVisibility 같은 값 미발사·삭제 카드 문구 파생 순수 — RN 재사용 대상), `use-auto-dismiss-toast`(3초 자동 소멸 토스트 공유 훅 — PR #62 리뷰로 3곳 중복 추출, 동일 문구 연속 설정 타이머 재시작 보장), `report`(widgets/cell-detail에서 이동 — REPORT_REASONS·canSubmitReport + `toServerReportReason` FE 3종→서버 enum·`reportFailureNotice` 11409/409 중복 분기) · api: `use-video-mutations`(`useDeleteVideo` 도감·격자 무효화 + upload `invalidateGridQueries` cross-feature 재사용, `useSetVideoVisibility`, `useReportVideo`) · ui: `VideoMoreMenu`(Radix DropdownMenu 복합 소유 — 삭제 확인 모달·신고 모달·실패 토스트 동봉, mine 분기), `VideoDeleteConfirmDialog`(danger confirm — 대상 카드 실데이터), `ReportDialog`·`ReportReasonSelect`(이동 + 실 POST). 진입점: 도감 `GalleryVideoCard` ⋯ + 미니 패널 헤더 ⋯
- **upload** — model: `upload-wizard`(스텝 전이), `upload-orchestration`(presign→S3 PUT→확정 상태머신), `upload-validation`, `highlight-selection`(+훅), `video-trim`, `processing-poll`, `processing-store`, `upload-modal-store`, `use-upload-location`, `presign-purpose` · api: `use-upload-mutations`, `s3-upload`, `ffmpeg-trim`(ffmpeg.wasm), `use-processing-watcher`(AppLayout 상주), `invalidate-grid-queries` · ui: `UploadModal`+`use-upload-wizard`, `SelectStep`/`HighlightStep`/`PreviewStep`, `SegmentList`/`SegmentRow`/`SegmentTrimmer`, `UploadDropzone`, `VideoPreview`, `AnalyzingModal`, `BlurConfirmModal`, `BlurNoticeToast`, `UploadProcessingNotices`

## entities/ (5)

- **cell** — `cell.ts`(LatLng/Bounds/Cell/CellVideo), `grid.ts`(EPSG:5179 100m 격자 인코딩, 서버 정본), `cell-geometry.ts`, `mock-cells.ts`
- **badge** — `badge-art.ts`(code→메달 매핑, iconUrl 우선), `assets/*.svg` 24종(Figma 뱃지 시안 export)
- **dex** — `dex.ts`(생성 타입 파생 — 요약·수집 격자·수집 영상·뱃지·행정동 통계 + FE 파생 RecentRegion·GalleryGridGroup), `mock-dex.ts`(자체 타입 — map-home mock 스캐폴딩 전용 존치)
- **profile** — `profile.ts`(`toProfileData`), `avatar-fallback.ts`, `assets/default-profile-image.png`
- **region** — `boundary-geometry.ts`(pointInPolygon·clipLineToBoundary), `busan-boundary.ts`(BUSAN_BBOX) — mock `regions.ts`는 MSG-328에서 삭제(실 API 대체)

## shared/

- api: `http-client.ts`(공용 Ky), `client-config.ts`(hey-api 런타임), `auth-pipeline.ts`, `api-error.ts`, `error-interceptor.ts`, `envelope.ts`(봉투 언랩), `generated/**`(hey-api 생성물 — 수정 금지)
- 어댑터(RN 경계 경유지): `storage.ts`(webStorage·oauthState·uploadIntent·deviceId·pendingVideo·**fcmToken**(MSG-408 — auth↔notifications 매개)), `navigation.ts`, `geolocation.ts` · 유틸: `format.ts`(formatDuration 포함), `use-debounced-value.ts`(flush 지원 디바운스 훅)
- 테스트 인프라 `src/test/`: `setup`, `render-with-providers`, `stub-fetch`, `envelope-response`, `occupied-grids`, `playback-fixture`, `instant-load-image`, `auth-session`(signIn/signOutForTest), `query-wrapper`(공용 QueryClient 래퍼)

## ui-web 인벤토리 (packages/ui-web/src/index.ts — 22 컴포넌트 + cn)

`Button`/`buttonVariants` · `Chip` · `DotsLoader`(도트 로더 — Figma 14750:3119, `animate-dot-pulse`는 tailwind-preset keyframes) · `Input` · `Switch` · `Selector` · `Avatar` · `CellBadge` · `Dots` · `Toast` · `ModalCard` · `DialogShell` · `BottomSheet` · `AppHeader` · `SearchBar` · `Fab` · `MapIconButton` · `ZoomControl` · `GridCell` · `VideoRow` · `BottomNav`(+Item) · `SideRail`(+Item) · `cn`

전 컴포넌트 스토리 존재. 형제 패키지: `design-tokens`, `tailwind-preset`, `ui-native`.

## 테스트 자산 (apps/web/src — 165개, smoke 28개) + e2e 3스펙(apps/web/e2e — 로그인 시딩 `auth-session-stub`(getMe `locationConsent: true` 스텁 포함), `consent-gate-popstate.spec.ts`는 실브라우저 히스토리 방향 판별 고정 — MSG-407)

레이어별 분포: app 5 · entities 7 · features/auth 6 · features/dex 11 · features/map-home 50 · features/notifications 7 · features/profile 12 · features/region 6 · features/search 3 · features/upload 16 · features/video-actions 6 · pages 20 · shared 9 · widgets 7. 목록은 `**/*.test.*`·`**/*.smoke.test.tsx` glob으로 확인 (2026-08-17 MSG-407에서 전수 재계수 — 종전 111·smoke 19·e2e 3스펙은 스테일이었음).

커버리지 공백(테스트 없는 로직 파일): `dex/use-collection-query`, `map-home/map-query-policy`, `profile/use-profile-image-upload`, `upload/use-processing-watcher`·`presign-purpose`·`use-highlight-selection`·`use-upload-wizard`·`use-video-duration`, `map-shell/sidebar-store`·`use-map-shell`, `map-home/use-escape-close`, `shared/error-interceptor`·`http-client`·`navigation`

## apps/mobile

존재 (Expo Router + NativeWind). features 대부분 스텁, `shared/format.parity.test.ts`로 웹/네이티브 동등성 검증(MSG-328에서 shared/format.ts로 앵커 재지정). 구 regions·recent-history parity는 웹 원본 삭제로 모바일 단독 테스트로 전환. 웹 티켓에서는 통상 무관 — 크로스 플랫폼 티켓만 소스 확인.

## 티켓 이력 (2026-08-13 이후 — 티켓당 한 줄 append)

- MSG-380: 하네스 개선 — 이 문서(STATUS.md) 신설, docs/spec·docs/retro 경로 신설 (코드 변경 없음)
- MSG-386: 린트 툴체인 oxlint 단일화 — eslint 계열 직접 devDep 8종·설정 4파일 제거, 루트 `.oxlintrc.json` + 토큰 규칙 자작 플러그인(`tools/oxlint/no-restricted-classes.mjs`), react-refresh 상당은 oxlint 네이티브 `react/only-export-components`(web 한정) 판정, TS catalog 7.0.2 상향. exhaustive-deps warn 검사 복원(기존 하이브리드에서 미검사 공백이었음). eslint는 react-doctor 전이 의존성으로만 잔존
- MSG-328: 탐색 페이지 제거 + 홈 좌측 패널 리디자인(Figma 14357-18972) + 지역·검색 API 5종 실연동 — `/explore`·features/explore 삭제(cell-detail·report는 widgets/cell-detail/model로 이동), features/region·search 신설, 비로그인은 쿼리 미발사 + 도감·검색창 즉시 로그인 모달(익명 401 실측, 도감은 RequireAuth 래핑)
- MSG-327: 개인 도감 mock 제거 + 실 API 6종 연동(users/me·collections/summary·grids·videos·badges·regions/stats by-point·by-grid) — 최근 수집 목록을 동(행정동) 단위로 전환, 갤러리를 격자 그룹+1열 영상 카드로 개정, 뱃지를 Figma 메달 아트 24종(entities/badge)으로 교체. regionCode 명세 갭은 by-grid 조인으로 해소(이름 매칭 기각), 진행 바는 by-point로 프론트 역지오코딩(region-lookup) 폐기, 갤러리 영상 클릭은 미니 패널 재생(widgets/video-mini-panel 이동)
- MSG-395: 상단 칩 4종 UI 개편 + 미션 API 실연동 — 핫구역은 격자 피드 → 행정동 요약(HotRegionPanel)으로, 지역축제·팝업스토어·경로추천은 `/api/missions/active` 실 데이터로 전환하며 mock 3종(`MOCK_THEME_CELLS`·`MOCK_ROUTE`·`themeCellsOf`)과 `ThemeFeedPanel`·`theme-feed` 폐기. features/map-home에 mission 도메인 12모듈 신설(shape 런타임 판별·진행도·상태 배지·코스 파싱·오버레이), pages/map-home/ui에 칩별 패널 14종 신설, map-overlay-store를 `routes[]`+`labels[]`로 확장하고 `zoomTo` 지도 명령 추가. 미션 격자는 **뷰포트로 클리핑**해 파생(전국 전개가 폴리곤 1만 4천 개를 만들어 지도를 멈추던 것 수정), 진행도는 내 수집 격자를 미션 도형에 넣는 방향으로 계산. 프로필 "내 활동"(스트릭·수집률) 실연동, 파비콘 교체
- MSG-403: 칩 표시 범위·갱신 시점 정정 + 미션 API 개편 이관 — 칩 활성 중 상시 점령 층을 숨기고(채움·클러스터 모두), 칩 셀은 저줌 게이트 예외로 남겨 축제·팝업 500m·코스 1km 줌에서도 보이게 함. 지도 데이터의 bbox 정본을 뷰포트 → **확정 영역**(region-panel-store `committedBounds`)으로 바꿔 "장소 불러오기"·칩 활성화 때만 갱신하고 헤더도 확정 지역명에 고정(MSG-328 라이브 동기화 폐기, `region-header` 삭제). 칩 바를 셸의 접힘 래퍼 밖으로 올려 패널을 접어도 유지, 사이드레일 활성 탭 재클릭을 "초기화 → 접기" 2단으로 개정. `/api/missions/active`가 type+bbox 필수로 바뀐 것에 맞춰 칩별 조회로 재편하고, 진행도·스팟 통계·미션 영상을 신규 서버 API 3종으로 이관해 FE 교집합 계산(`missionProgress`)과 격자 다중 조회 조합을 폐기. 미션 API에 비로그인 게이트 신설(익명 401 실측). 후속 요구로 코스 카드 클릭 시 `fitBounds`로 코스 전체 이동 + 라인이 없는 코스는 포토스팟 번호 순 직선 연결(`coursePath`), 상세 대상은 확정 영역이 아닌 자기 경계로 렌더. "장소 불러오기"는 축척 2km 단(`MIN_RELOAD_ZOOM`)까지만 노출. 좌측 패널 전부에 로딩 게이트 — 요소가 전부 준비될 때까지 ui-web `DotsLoader`(신규 승격)만 보이고 준비되면 한번에 표시(부분 렌더 금지)
- MSG-407: 위치정보 동의 온보딩 게이트 + 프로필 이미지 삭제 — 로그인 && `locationConsent=false`면 AppLayout이 `LocationConsentScreen`(Figma 14781:3343) 전면 조건 렌더(라우트 신설 없음, 뒤로가기·URL 직접 변경 포함 전면 차단이 의도된 설계), CTA가 `PUT location-consent`로 게이트 해제(getMe invalidate 경유), 이탈 수단은 2개 — 로그아웃 버튼(`useLogout` 서버 세션 무효화, codex P1 반영)과 **뒤로가기 = 로그인 중단**(popstate 시 로그아웃 후 navigate 없이 팝된 URL을 익명 렌더). 마케팅 행은 UI 전용(서버 API 부재)·[보기] 비활성·철회 캡션은 렌더 안 함. 편집 모달 [기본 이미지로] 삭제 예약 + `DELETE profile-image`(14783:4715), 저장 체인은 이미지→닉네임. 프로필 위치동의 접점(토글·설정 행)은 사용자 결정으로 전면 제거 — 인앱 철회 수단 없음(후속 티켓 후보), `locationEnabled`·`locationStatusLabel` 죽은 코드 정리. 로그인 시딩 픽스처 3곳 `locationConsent: true` 보수
- MSG-408: FCM 웹 푸시 기반 + 토큰 API 2종 연동 — features/notifications 신설(firebase 12 동적 import, config·VAPID는 코드 상수 정본 — VITE_ env 예외 승인), 프로필 "알림 설정" 준비 중 행을 "알림 받기" 토글(SettingToggleRow)로 대체(신규 등록 유일 진입점 — 자동 권한 프롬프트 없음), 셸 상주 PushNoticeHost(기존 등록자 자동 재등록·로테이션 + 포그라운드 onMessage 토스트), useLogout이 fcmToken body 동봉·보관 정리(shared fcmTokenStorage 매개), `public/firebase-messaging-sw.js`(쿼리스트링 config)
- MSG-410: 줌아웃 클러스터를 FE 윈도 스냅 산술 → 서버 집계 `GET /api/grids/aggregation`(줌 구간별 unit 동/구/시, 축척 표 역산)으로 전환 — `cluster-overlay` 산술 삭제(`gateFillCells`만 존치), 신규 3모듈(`aggregation-unit`·`region-cluster-overlay`·`use-grid-aggregation-query`), 마커는 지역명+개수 원형(Figma 14599:7025, unit별 68/80/92px+흰 링, `primary` 토큰) 클릭 시 단위 안쪽 줌 드릴다운, 겹침은 Web Mercator 픽셀 병합(임계=단위 지름, count 총합 보존). **집계 조회만 뷰포트 bbox(idle 갱신) — MSG-403 확정 영역 정본의 명시 승인 예외**(개별 격자·핫구역·미션은 확정 영역 유지), 칩 활성·비로그인·고줌 게이트, 업로드 무효화에 집계 키 추가, `currentRegion` 미소비(헤더 확정 지역명 고정 유지)
- MSG-411: 내 영상 삭제·공개 전환·신고 실연동 — features/video-actions 신설, 진입점 2곳(도감 `GalleryVideoCard` 썸네일 ⋯ — 루트 통짜 버튼 해체로 중첩 버튼 방지 · 미니 패널 헤더 ⋯, mine 분기: 내 영상=공개 범위 ✓ 전환+삭제 / 타인=신고만). 티켓이 지목한 CellMoreMenu는 미렌더 죽은 코드라 살아있는 표면에 신규 부착(존치 결정), ReportDialog류는 video-actions로 이동 + 실 POST(11409 중복 → "이미 신고" 안내, FE 사유 3종→서버 enum 매핑). 삭제는 확인 모달(Figma 14792:3610) 경유 DELETE + 도감·격자 캐시 무효화(upload `invalidateGridQueries` 재사용), 공개 전환은 같은 값 재선택 미발사(+ in-flight 중복 PATCH 가드 — codex 리뷰), visibility 확보는 메뉴 오픈 시 getPlayback 단건(목록 응답 visibility 부재 — 조회수 +1 부산물은 백엔드 환류 후보). 삭제 후속은 useDeleteVideo.onSuccess 중앙 처리 — 미니 패널 선택 일치 시 스토어 close + playback 캐시 remove, gridId 미상이면 격자 계열 광역 무효화(codex 리뷰 3·4 반영)
- MSG-412: 격자 검색 연동 — features/search에 `zone-search`(zones 48건 역파싱: "서면 A-14" → 구역명 매칭 + A=북단·1=서단 칸 코드 역산)·`use-zones-query`(로그인 게이트 + Infinity 세션 1회 캐시)·`use-grid-search` 신설, HomeSearchBox 드롭다운에 격자 섹션(장소 결과 위, 로컬 필터 즉시), 선택 시 moveTo+줌 보장(`GRID_MIN_ZOOM` cross-feature import — 저줌 게이트에 하이라이트가 걷히는 결함 방어)+`emphasizeCell` 2단 하이라이트(재생 강조 병존·탭 판정 집합 불변), 구역명 단독 매치는 구역 fitBounds. BE zone-naming.json 픽스처 대조는 후속 보강(자체 케이스 승인), 장소 결과 하이라이트 확장은 범위 밖 후속 후보
