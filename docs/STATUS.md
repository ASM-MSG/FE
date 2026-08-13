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
| (root) | `AppLayout` | 사이드레일 + Outlet + UploadModal/LoginModal/UploadProcessingNotices 상주 |
| (error) | `RouteErrorBoundary` | 렌더·로더 오류 + 404 수렴 (MSG-325) |
| (layout) | `MapShell` | 전 네비 섹션 공유 지속 지도 셸 |
| `/` | `MapHomePage` | 지도 홈 (검색·지역 격자 패널 포함 — MSG-328에서 탐색 흡수) |
| `/upload` | `SectionPanel` 스텁 | 실제 업로드는 모달 |
| `/dex/:tab?` | `RequireAuth > DexPanel` | 탭이 URL 정본 (`/dex`·`/dex/badges`), 비로그인 시 홈+로그인 모달 (MSG-328) |
| `/profile` | `RequireAuth > ProfilePanel` | 로그아웃 시 홈+로그인 모달 |
| `/oauth/kakao/callback` | `KakaoCallbackPage` | 셸 밖 라우트 (MSG-325) |

로그인 라우트 없음 — `LoginModal`로 처리. 기타 app/: `QueryProvider`, `RequireAuth`, `configure-auth.ts`(shared 파이프라인↔auth 스토어 배선).

## pages/ (4)

- **map-home** — `MapHomePage` + ui/: `MapCanvas`(네이버 지도+오버레이), `MapControls`, `RegionPanel`(기본 분기 — 행정동 헤더+격자 카드 리스트+전체 지역 모드+비로그인 로그인 유도), `RegionGridCard`, `RegionListView`, `RegionReloadButton`("{행정동} 장소 불러오기" 재검색 pill), `HomeSearchBox`(장소 검색+인기 검색어 드롭다운), `RetryNotice`(실패+재시도 행 공용), `CellActionRow`, `HomeCellDetailPanel`, `FeedVideoCard`, `FeedVideoList`(격자 상세·테마 피드 공용), `VideoMiniPanel`(실 재생), `VideoOwnerMeta`, `ThemeChip`/`ThemeChipsBar`/`ThemeFeedPanel`, `naver-sdk-loader.ts`(SDK 격리 경계), `use-escape-close.ts`, `use-home-entry-lifecycle.ts`
- **dex** — `DexPanel` + ui/: `DexProfileHeader`, `DexStatCards`, `DexTabs`, `RegionProgress`, `RecentCellRow`, `BadgeTabBody`, `GalleryTabBody`, `GalleryThumbnail`
- **profile** — `ProfilePanel` + ui/: `ProfileHeader`, `ActivityCard`, `SettingRow`
- **oauth-callback** — `KakaoCallbackPage` (ui/ 없음)

## widgets/ (4)

- **map-shell** — `MapShell`(지도 인스턴스 라우트 전환 유지), `SidebarCollapseHandle`, `use-map-shell.ts`(지도 명령 API, 뷰-레이어 훅), `map-overlay-store.ts`, `sidebar-store.ts`, `grid-click-routing.ts`(순수 함수, RN 재사용 대상)
- **cell-detail** — `CellDetailSheet`, `CellMoreMenu`(Radix DropdownMenu), `ReportDialog`, `ReportReasonSelect` · model/: `cell-detail`, `cell-detail-store`, `report` (MSG-328에서 구 features/explore로부터 이동 — 소비처가 이 위젯과 pages/dex뿐)
- **section-panel** — `SectionPanel`(네비 섹션 공통 388px 패널)
- **side-rail-nav** — `SideRailNav`(ui-web `SideRail` 라우터 연결)

## features/ (7 도메인)

- **auth** — model: `auth-store`(팩토리), `kakao-oauth`, `login-modal-store` · api: `use-auth-mutations` · ui: `LoginModal`, `LoginContent`, `KakaoLoginButton`, `DevLoginPanel`
- **dex** — model: `dex-summary`, `badges`, `gallery`, `dex-tab`, `current-region`(+훅), 스토어 `gallery-region-store`·`recent-removal-store`, 쿼리 `use-dex-query`·`use-gallery-query` · api/·ui/ 없음(UI는 pages/dex)
- **region** — model: `region-panel-store`(표시 지역+패널 모드+선택 출처 auto/manual), `region-reload`(재검색 버튼 노출 판정 순수 함수), `region-header`(헤더 표시명 선택 — 지도 이동 라이브 동기화, manual 선택 고정), `grid-card`(격자명 조합·격자 중심 좌표), 쿼리 훅 `use-reverse-geocode-query`(중심 좌표 디바운스 500ms)·`use-region-grids-query`(sort=LATEST·limit=20)·`use-explore-regions-query` · ui/ 없음(UI는 pages/map-home)
- **search** — model: `use-place-search-query`(디바운스 300ms+searchNow), `use-trending-query` · ui/ 없음(UI는 pages/map-home HomeSearchBox)
- **map-home** (최대 도메인) — 오버레이/기하: `grid-overlay`, `occupied-grid-overlay`(EPSG:5179), `cluster-overlay`, `theme-overlay`, `grid-label`, `map-scale` · 도메인: `theme`, `theme-feed`, `home-cell-detail`, `grid-videos`, `video-playback`, `viewport-query`, `map-query-policy` · 스토어: `viewport-store`(플랫폼 중립), `theme-filter-store`, `home-cell-detail-store`, `video-mini-panel-store` · 쿼리 훅: `use-cells-query`(mock — 소비처 DexPanel뿐, 도감 실 API 티켓에서 정리 예정), `use-occupied-grids-query`·`use-hotzones-query`(비로그인 미발사 — 인증 게이트, MSG-328), `use-grid-detail-query`, `use-grid-videos-query`, `use-video-playback-query` · ui/ 없음(UI는 pages/map-home)
- **profile** — model: `profile-edit`, `profile-format`, `profile-image`(업로드 순수 로직), `upload-profile-image`(오케스트레이션 포트), `use-profile-image-upload`(웹 포트 훅), `use-profile-query` · api: `use-profile-mutations` · ui: `ProfileEditModal`, `DeleteAccountModal`
- **upload** — model: `upload-wizard`(스텝 전이), `upload-orchestration`(presign→S3 PUT→확정 상태머신), `upload-validation`, `highlight-selection`(+훅), `video-trim`, `processing-poll`, `processing-store`, `upload-modal-store`, `use-upload-location`, `presign-purpose` · api: `use-upload-mutations`, `s3-upload`, `ffmpeg-trim`(ffmpeg.wasm), `use-processing-watcher`(AppLayout 상주), `invalidate-grid-queries` · ui: `UploadModal`+`use-upload-wizard`, `SelectStep`/`HighlightStep`/`PreviewStep`, `SegmentList`/`SegmentRow`/`SegmentTrimmer`, `UploadDropzone`, `VideoPreview`, `AnalyzingModal`, `BlurConfirmModal`, `BlurNoticeToast`, `UploadProcessingNotices`

## entities/ (4)

- **cell** — `cell.ts`(LatLng/Bounds/Cell/CellVideo), `grid.ts`(EPSG:5179 100m 격자 인코딩, 서버 정본), `cell-geometry.ts`, `mock-cells.ts`
- **dex** — `dex.ts`(생성 타입 파생), `mock-dex.ts`
- **profile** — `profile.ts`(`toProfileData`), `avatar-fallback.ts`, `assets/default-profile-image.png`
- **region** — `boundary-geometry.ts`(pointInPolygon·clipLineToBoundary), `busan-boundary.ts`(BUSAN_BBOX) — mock `regions.ts`는 MSG-328에서 삭제(실 API 대체)

## shared/

- api: `http-client.ts`(공용 Ky), `client-config.ts`(hey-api 런타임), `auth-pipeline.ts`, `api-error.ts`, `error-interceptor.ts`, `envelope.ts`(봉투 언랩), `generated/**`(hey-api 생성물 — 수정 금지)
- 어댑터(RN 경계 경유지): `storage.ts`, `navigation.ts`, `geolocation.ts`, `region-lookup.ts` · 유틸: `format.ts`(formatDuration 포함), `use-debounced-value.ts`(flush 지원 디바운스 훅)
- 테스트 인프라 `src/test/`: `setup`, `render-with-providers`, `stub-fetch`, `envelope-response`, `occupied-grids`, `playback-fixture`, `instant-load-image`, `auth-session`(signIn/signOutForTest), `query-wrapper`(공용 QueryClient 래퍼)

## ui-web 인벤토리 (packages/ui-web/src/index.ts — 21 컴포넌트 + cn)

`Button`/`buttonVariants` · `Chip` · `Input` · `Switch` · `Selector` · `Avatar` · `CellBadge` · `Dots` · `Toast` · `ModalCard` · `DialogShell` · `BottomSheet` · `AppHeader` · `SearchBar` · `Fab` · `MapIconButton` · `ZoomControl` · `GridCell` · `VideoRow` · `BottomNav`(+Item) · `SideRail`(+Item) · `cn`

전 컴포넌트 스토리 존재. 형제 패키지: `design-tokens`, `tailwind-preset`, `ui-native`.

## 테스트 자산 (apps/web/src — 109개, smoke 19개)

레이어별 분포: app 4 · entities 6 · features/auth 6 · features/dex 9 · features/map-home 23 · features/profile 7 · features/region 6 · features/search 1 · features/upload 15 · pages 17 · shared 9 · widgets 6. 목록은 `**/*.test.*`·`**/*.smoke.test.tsx` glob으로 확인.

커버리지 공백(테스트 없는 로직 파일): `dex/use-current-region`, `map-home/map-query-policy`, `profile/use-profile-image-upload`, `upload/use-processing-watcher`·`invalidate-grid-queries`·`presign-purpose`·`use-highlight-selection`·`use-upload-wizard`·`use-video-duration`, `map-shell/sidebar-store`·`use-map-shell`, `map-home/use-escape-close`, `shared/error-interceptor`·`http-client`·`navigation`

## apps/mobile

존재 (Expo Router + NativeWind). features 대부분 스텁, `shared/format.parity.test.ts`로 웹/네이티브 동등성 검증(MSG-328에서 shared/format.ts로 앵커 재지정). 구 regions·recent-history parity는 웹 원본 삭제로 모바일 단독 테스트로 전환. 웹 티켓에서는 통상 무관 — 크로스 플랫폼 티켓만 소스 확인.

## 티켓 이력 (2026-08-13 이후 — 티켓당 한 줄 append)

- MSG-380: 하네스 개선 — 이 문서(STATUS.md) 신설, docs/spec·docs/retro 경로 신설 (코드 변경 없음)
- MSG-386: 린트 툴체인 oxlint 단일화 — eslint 계열 직접 devDep 8종·설정 4파일 제거, 루트 `.oxlintrc.json` + 토큰 규칙 자작 플러그인(`tools/oxlint/no-restricted-classes.mjs`), react-refresh 상당은 oxlint 네이티브 `react/only-export-components`(web 한정) 판정, TS catalog 7.0.2 상향. exhaustive-deps warn 검사 복원(기존 하이브리드에서 미검사 공백이었음). eslint는 react-doctor 전이 의존성으로만 잔존
- MSG-328: 탐색 페이지 제거 + 홈 좌측 패널 리디자인(Figma 14357-18972) + 지역·검색 API 5종 실연동 — `/explore`·features/explore 삭제(cell-detail·report는 widgets/cell-detail/model로 이동), features/region·search 신설, 비로그인은 쿼리 미발사 + 도감·검색창 즉시 로그인 모달(익명 401 실측, 도감은 RequireAuth 래핑)
