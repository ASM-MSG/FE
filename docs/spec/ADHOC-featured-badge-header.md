# ADHOC: 프로필·도감 헤더에 대표 뱃지 pill 노출 (지라 티켓 없음)

## 기획 요약

MSG-413에서 설정 가능해진 대표 뱃지(최대 2개, rank 순)를 두 곳의 상단 프로필에 상시 노출한다 — ① 프로필 페이지 `ProfileHeader`(Image #1), ② 도감 `DexProfileHeader`(Image #2). 스타일 정본은 Image #3 = MSG-413 `FeaturedProfilePreview`의 pill(primary 테두리·primary 텍스트·rounded-full, 예: "기록러 Ⅰ" "기록러 Ⅲ"). 별도 Figma 시안 없음 — Image #3과 `FeaturedProfilePreview` 실코드(`pages/dex/ui/FeaturedProfilePreview.tsx`의 li 클래스)가 구현 정본이다.

## 이미지 판독 결과 (배치 근거)

- **Image #1** (프로필 헤더 현재): 아바타 + 닉네임 "강정만두" + 메타 줄 "가입일 2026.08.09 · fillmapt…" (2줄 구성, 우측 [편집] 버튼)
- **Image #2** (도감 헤더 현재): 아바타 + 닉네임 + 메타 줄 "격자 101개 · 영상 104개 기록" (2줄 구성, 우측 [프로필] pill)
- **Image #3** (정본): 아바타 + 닉네임, 그 **바로 아래 줄**에 pill 2개 나열. 단, Image #3(미리보기 카드)에는 메타 줄이 없다 — 두 헤더에는 메타 줄이 이미 있으므로 **pill을 메타 줄 아래 세 번째 줄로 추가**하는 배치를 제안한다(추정 A1). 메타 줄을 pill로 대체하면 가입일·기록 요약 정보가 소실된다(기각 제안).

## 데이터·구조 확인 (실측)

- 조회: `GET /api/badges`(`findMyBadges`) 응답의 `featuredRank: number | null` — 도감은 `useBadgesQuery`(features/dex/model/use-collection-query)로 **이미 상시 발사 중**(단, DexPanel 골격 게이트는 profile+summary+grids 셋만 — badges는 게이트 밖). 프로필 페이지는 **미발사** — 배선 필요
- 갱신 경로: MSG-413 `useReplaceFeaturedBadges`가 저장 성공 시 `findMyBadgesQueryKey()` invalidate → `useBadgesQuery`와 같은 키라 **두 헤더 pill이 추가 작업 없이 자동 갱신**된다
- cross-feature import 선례: pages 레이어의 다도메인 feature import는 확립된 관례 — `DexPanel`이 `features/profile/use-profile-query`를, `ProfilePanel`이 `features/auth`·`features/notifications`를 이미 import. **pages/profile → features/dex는 FSD 위반 아님**
- pill 세 번째 사용처: `FeaturedProfilePreview`(1) + 두 헤더(2·3) — 공용 추출 대상. ui-web 승격은 부적합(도메인 데이터 `{id, name}[]` 소비 + 웹 단독 → DESIGN_SYSTEM 소속 기준상 features/), **`features/dex/ui/` 신설**로 추출 제안(추정 A3, features/dex 최초의 ui/ — 타 feature(profile·auth 등) ui/ 관례와 정렬)
- 워킹 트리 실측: 오케스트레이터 전달("MSG-414 스테이징, 커밋 대기")과 달리 **MSG-414는 이미 커밋됨**(`7e34e63`, 워킹 트리 clean, 브랜치 `feat/msg-414-dex-upload-history-grass`). 이 작업은 그 위 별도 커밋 — 충돌 경계 문제는 사실상 해소, MSG-414 산출 파일(RecordTabBody·UploadGrassGrid·UploadHistoryModal·upload-grass 등)은 무수정 유지

## 수용 기준

| # | 기준 | 유형 | 검증 방법 |
|---|------|------|----------|
| 1 | 순수 파생 `featuredBadgesOf(badges)`: `featuredRank`가 있는 뱃지만 rank 오름차순 `{id, name}[]`로 반환하고, 대표 0개면 빈 배열, rank null(비대표·미획득)은 제외한다 | 로직 | vitest (badge-showcase 확장) |
| 2 | 대표 뱃지 설정 계정으로 `/profile` 진입 시 `ProfileHeader` 메타 줄("가입일 …") 아래에 pill이 rank 순으로 표시된다 — 스타일은 `FeaturedProfilePreview` pill과 동일(primary 테두리·텍스트, rounded-full, fm-caption) | 화면 | 브라우저 + Image #3 대조 |
| 3 | 같은 계정으로 `/dex` 진입 시 `DexProfileHeader` 메타 줄("격자 N개 · …") 아래에도 동일 pill이 표시된다 | 화면 | 브라우저 + Image #3 대조 |
| 4 | 대표 뱃지 0개(미설정 계정)면 pill 행 자체가 렌더되지 않아 두 헤더가 기존 2줄 모습 그대로다(빈 공간·placeholder 없음). badges 로딩 중·에러 시에도 동일 — 페이지 골격 게이트는 확장하지 않는다 | 화면 | 브라우저(대표 전부 해제 후) + vitest 스모크 |
| 5 | 프로필 페이지 진입 시 `GET /api/badges`가 발사된다(`useBadgesQuery` 재사용 — 신규 훅 없음) | 로직 | vitest (profile-panel 스모크 — 스텁에 badges 추가) |
| 6 | 도감 뱃지 탭에서 대표 뱃지를 변경·저장하면(기존 MSG-413 플로우) 별도 새로고침 없이 도감 헤더 pill이 갱신된다 — findMyBadges invalidate 공유 키 경유 | 화면 | 브라우저 (저장 → 헤더 확인) |
| 7 | pill 공용 추출 후 `FeaturedProfilePreview`(뱃지 탭 편집모드 미리보기)의 시각 결과·동작은 변화 없다 | 화면 | 기존 badge-tab 스모크 그린 + 브라우저 1회 |

**검증 프로파일**: **화면** — 두 헤더의 시각 결과(Image #3 대조)가 기준이고 파생 로직·쿼리 배선이 섞여 넓은 쪽으로 판정. 단 Figma 대조는 없음(Image #3 + FeaturedProfilePreview 실코드가 대체 정본)이고 신규 인터랙티브 요소가 없어 a11y는 pill 목록의 시맨틱(ul/li) 확인 정도로 축소 — 소규모 요청에 맞춘 경량 풀코스.

## 구현 계획

- **브랜치**: 기존 `feat/msg-414-dex-upload-history-grass` 그대로, MSG-414 커밋(`7e34e63`) 위 **별도 커밋** (사용자 지시). 티켓 키 없으므로 커밋 메시지는 `feat: 프로필·도감 헤더 대표 뱃지 pill 노출` 형태 제안(추정 A5)
- **재사용**: `useBadgesQuery`(features/dex — 신규 쿼리 훅 없음), 기존 `findMyBadges` invalidate 체인(MSG-413), pill 마크업(`FeaturedProfilePreview` li 클래스 그대로 이동)
- **신규 로직** (test-first):
  - `features/dex/model/badge-showcase.ts`에 `featuredBadgesOf(badges: DexBadge[]): { id: number; name: string }[]` 추가 — 기존 진열장 정렬 모듈의 자연 확장, 순수 함수(RN 재사용 대상). 테스트 3~4케이스(rank 순·0개·null 제외)
- **신규 UI**:
  - `features/dex/ui/FeaturedBadgePills.tsx` — props `badges: { id: number; name: string }[]`, 빈 배열이면 null 반환. `FeaturedProfilePreview`의 `<ul>` pill 블록을 그대로 이동(features/dex 최초 ui/ 디렉토리 신설)
- **수정**:
  - `pages/dex/ui/FeaturedProfilePreview.tsx` — 인라인 pill ul → `FeaturedBadgePills`로 교체(시각 동일, AC 7)
  - `pages/profile/ui/ProfileHeader.tsx` — props에 `featuredBadges: { id: number; name: string }[]` 추가, 메타 줄 아래 `FeaturedBadgePills` 렌더(프레젠테이션 유지 — 쿼리는 패널 몫)
  - `pages/dex/ui/DexProfileHeader.tsx` — 동일 props 추가·렌더
  - `pages/profile/ProfilePanel.tsx` — `useBadgesQuery()` 발사 + `featuredBadgesOf(badges.data ?? [])` 전달. 기존 로딩/에러 게이트 무변경(badges는 게이트 밖 — AC 4)
  - `pages/dex/DexPanel.tsx` — 이미 보유한 `badges.data`로 파생 전달 (1지점)
  - `pages/profile/profile-panel.smoke.test.tsx` — 스텁에 `/api/badges` 응답 추가 + pill 렌더/미렌더 단정 (AC 4·5)
- **라우트**: 변경 없음
- **승격 후보**: 없음 (pill은 features/dex/ui 소속 — ui-web 부적합 판단은 위 실측 절 참조)

## 추정 및 질문 (사용자 확인 필요)

- **A1. 배치 = 메타 줄 아래 세 번째 줄** — Image #3은 메타 줄이 없는 카드라 직역 불가. 기존 메타 줄(가입일·격자/영상 기록)을 보존하고 그 아래 pill 행 추가를 제안. 메타 줄 대체(닉네임 바로 아래 pill)를 원하면 지정 필요
- **A2. 0개·로딩·에러 = pill 행 미렌더(높이 축소)** — 도착 시 행이 나타나며 헤더가 한 줄 늘어나는 사소한 시프트를 수용(도감 RegionProgress "미도착 시 보류" 선례). 대안(높이 상시 예약)은 대표 미설정 사용자에게 빈 공간을 상시 노출해 기각 제안. 골격 게이트 확장(시프트 0)은 뱃지 API 실패가 페이지 전체를 막아 기각 제안
- **A3. pill 공용 추출 = `features/dex/ui/FeaturedBadgePills` 신설** — 세 번째 사용처 도달. ui-web 승격은 도메인 데이터·웹 단독이라 기각 제안(대안 기록만)
- **A4. 프로필 페이지에 `GET /api/badges` 1회 추가 발사** — 장식 목적 조회 비용 수용 (entityQueryPolicy 캐시 공유로 도감 왕래 시 재사용)
- **A5. 커밋 메시지** — 티켓 키 없어 `feat: …`(키 생략) 제안. 스펙·작업로그 보존 위치는 `docs/spec/` 관례가 MSG 키 기준이라 오케스트레이터/사용자 판단 필요(예: docs/spec/ADHOC-featured-badge-header.md 또는 미보존)

## 리스크

- **같은 브랜치 선행 커밋** — MSG-414 커밋이 이미 브랜치에 있어 PR을 만들면 두 작업이 함께 실린다(사용자 의도로 확인됨). 이 커밋은 MSG-414 산출 파일을 건드리지 않는다 — 접점인 `DexPanel.tsx`도 MSG-414(탭 분기)와 다른 지점(헤더 props)만 수정
- **오케스트레이터 전달 정보와 실측 불일치** — "스테이징 커밋 대기"가 아니라 이미 커밋 완료 상태(`7e34e63`). 스펙은 실측 기준으로 작성
- **미획득 뱃지 이름 스포일러 무관** — pill은 featuredRank 보유(=획득) 뱃지만 다루므로 MSG-123 "미획득 이름 숨김" 규칙과 충돌 없음
- **Figma 오탐 방지**: Figma 시안 없음 — 대조 정본은 Image #3 + `FeaturedProfilePreview` 실코드. Image #3의 "프로필 미리보기" 제목·카드 배경(`bg-primary/5`)은 미리보기 카드 전용 요소로 **헤더에는 이식하지 않는다**(pill만 가져온다) — 배경 없는 pill 행이 결함이 아님. Image #1·2의 닉네임 "강정만두"·수치는 실데이터 렌더가 정본

## 승인 결과 (2026-08-18, 사용자 확인)

- **A1 배치 — 제안 기각, 대체안 채택**: pill은 3번째 줄 추가가 아니라 **메타 줄을 대체**한다(Image #3 직역 — 2줄 유지). 단 A2와의 조합 해석: 대표 뱃지 ≥1개일 때만 메타 줄 자리에 pill 행을 렌더하고, **0개·로딩·에러 시에는 기존 메타 줄(가입일…/격자·영상 기록)이 그대로 남는 폴백** — 헤더는 항상 2줄, 레이아웃 시프트는 pill↔메타 교체 순간뿐.
- **A2**: pill 행 미렌더(위 폴백 해석) 승인 — 높이 상시 예약 기각.
- **A3~A4**: 이견 없음 확정 — `features/dex/ui/FeaturedBadgePills` 신설, 프로필 페이지 badges 1회 조회 추가.
- **A5**: 커밋 키 없는 `feat:` 사용, 스펙·작업로그는 `docs/spec/ADHOC-featured-badge-header.md`로 보존(사용자 승인).
- 수용 기준 2·3·4는 위 대체 배치로 갱신해 읽는다: "메타 줄 아래" → "메타 줄 자리(대체)", 기준 4의 "기존 2줄 그대로" = 메타 줄 폴백.

## 작업 로그 (2026-08-18)

**성격**: 지라 티켓 없는 즉석 요청(사용자 확인). MSG-414와 같은 브랜치·같은 PR(#67)에 별도 커밋으로 진행.

**승인 반영**: pill은 메타 줄 **대체**(A1 제안 기각 — Image #3 직역), 대표 0개·로딩·에러는 기존 메타 줄 폴백이라 헤더는 항상 2줄. 스펙·작업로그는 이 파일로 보존(A5).

**실측 동작**
- `featuredBadgesOf`(features/dex/model/badge-showcase.ts) 신설 — featuredRank 보유분만 rank 오름차순, 0개면 빈 배열. test-first 3케이스(RED 확인)
- `features/dex/ui/FeaturedBadgePills.tsx` 신설(features/dex 최초 ui/) — 빈 배열이면 null, `aria-label="대표 뱃지"`. `pages/dex/ui/FeaturedProfilePreview.tsx`의 인라인 ul을 이 컴포넌트로 교체(li 클래스 그대로 이동 — 시각 무변화)
- `ProfileHeader`·`DexProfileHeader`에 필수 prop `featuredBadges` 추가 — ≥1개면 메타 줄(가입일·탐험 규모) 자리를 pill 행으로 대체
- 배선: `ProfilePanel`이 기존 `useBadgesQuery` 재사용 발사(신규 훅 없음·골격 게이트 무변경), `DexPanel`은 기보유 `badges.data`에서 파생. 저장 시 헤더 갱신은 MSG-413의 `findMyBadges` invalidate 키 공유로 자동(추가 코드 없음)
- 테스트: profile-panel 스모크 2케이스(pill 대체 렌더 rank 순 + 0개 폴백·badges 발사), profile-header 단위, badge-tab 스모크 2건은 `findByText`→`findAllByText(2)` 갱신

**검증 결과**: 7/7 통과. 풀 게이트 6종 통과(check:duplication은 신규 패밀리 0건·라인 재키잉만이라 베이스라인 형식 재기록). Image #3 대조 — 계산 스타일 `rgb(0,102,204)` 텍스트·1px 테두리·`border-radius: 9999px`·11px/14px, 대비 5.56:1로 4.5:1 충족. 실계정에서 대표 뱃지 전부 해제→폴백 실측→원래 조합(기록러 Ⅰ/Ⅲ) 복구까지 확인.

**badge-tab 스모크 단정 갱신 판정(약화 아님)**: 픽스처 "한 달 개근"이 `featuredRank: 1`이라 헤더 pill 노출 후 이름이 화면 2곳에 등장 — `findByText` 단일 매치가 필연 실패. `findAllByText(...).toHaveLength(2)`는 "존재"에서 "정확히 2개"로 단정이 강화된 형태이며 새 동작을 개수로 문서화.

**검토한 대안 (기각)**
- pill을 메타 줄 아래 3번째 줄로 추가 — 사용자가 Image #3 직역(2줄 유지)을 선택해 기각
- 미설정 계정에 pill 높이 상시 예약 — 빈 여백만 남아 기각, 메타 줄 폴백으로 대체
- pill을 ui-web으로 승격 — 도메인 데이터(뱃지) 의존 + 웹 단독이라 features/dex/ui에 유지
- 프로필 전용 뱃지 쿼리 훅 신설 — 기존 `useBadgesQuery` 재사용으로 충분

**잔여**: `badge-showcase.ts`에서 `orderBadges`의 JSDoc이 `featuredBadgesOf` 위에 떠 보이는 배치(각 함수에 자기 JSDoc이 있어 동작·오독 위험 없음, 다음 손댈 때 정리 후보).
