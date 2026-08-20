import type {
  CollectionGridResponseDto,
  CollectionSummaryResponseDto,
  MyBadgeResponseDto,
  RegionStatResponseDto,
  RegionVideoResponseDto,
  UploadHistoryResponseDto,
} from "../../../shared/api/sdk";

/*
 * MSG-425: 도감 화면이 소비하는 명세 대응 타입은 생성 타입에서 type-only 파생한다
 * (웹 `apps/web/src/entities/dex/model/dex.ts` 미러). 생성물 경로는 직접 참조하지 않고
 * `shared/api/sdk` 배럴을 경유한다 — 크로스 앱 상대 경로를 `sdk.ts`·`query-options.ts`
 * 두 파일에만 가둔다는 MSG-419 결정을 지키기 위함이다.
 *
 * `DexBadge`·`UploadHistoryDay`는 MSG-430(뱃지·기록 탭 내용)이 추가했다 — MSG-425가
 * 예고한 소유 경계 그대로다 (추정 A9).
 */

/**
 * 개인 도감 요약 — `GET /api/collections/summary` (통계 타일 3개, S2).
 * Required 승격은 명세가 optional로 회귀해도 화면 계약을 지키는 안전망이며,
 * 명세 필드명 변경·제거는 이 Pick이 typecheck로 잡는다.
 */
export type DexSummary = Required<
  Pick<
    CollectionSummaryResponseDto,
    | "totalGridCount"
    | "totalVideoCount"
    | "visitedRegionCount"
    | "currentStreak"
    | "badgeCount"
  >
>;

/**
 * 내가 수집한 격자 — `GET /api/collections/grids` (동 목록 원재료, S4).
 * gridId는 명세 체계 "{gridY}_{gridX}"다. regionName은 격자 중심 행정동이며
 * 무귀속·미판정이면 null이라 동 묶음에서 제외된다 (L2).
 */
export type CollectedGrid = Required<
  Pick<
    CollectionGridResponseDto,
    "gridId" | "gridY" | "gridX" | "lastUploadedAt" | "videoCount"
  >
> &
  Pick<CollectionGridResponseDto, "regionName" | "zoneName" | "zoneCell">;

/**
 * 내가 수집한 개별 영상 — `GET /api/collections/videos?regionCode=` (갤러리 본문, S7·S8).
 * 한 격자에 영상이 여러 개면 각각 별도 항목이다. zoneName·zoneCell은 격자 그룹 라벨
 * 재료로, 구역 밖이면 둘 다 null이라 상위 행정동 이름으로 폴백한다 (L6).
 */
export type CollectedVideo = Required<
  Pick<
    RegionVideoResponseDto,
    "videoId" | "gridId" | "durationSec" | "createdAt"
  >
> &
  Pick<RegionVideoResponseDto, "thumbnailUrl" | "zoneName" | "zoneCell">;

/**
 * 행정동 수집률 — `GET /api/regions/stats/by-point`·`by-grid` (S1·S6).
 * by-grid는 gridId로 그 격자 중심 행정동의 regionCode를 되돌려주므로,
 * regionCode가 없는 `collections/grids` 응답과 `collections/videos` 요청 사이를 잇는다.
 */
export type RegionStat = Required<
  Pick<
    RegionStatResponseDto,
    | "regionCode"
    | "regionName"
    | "collectedCount"
    | "totalCount"
    | "progressRate"
  >
>;

/**
 * "최근 수집한 격자" 목록의 한 행 — 수집 격자를 행정동으로 묶은 FE 파생 단위 (L1).
 * 명세에 대응 응답이 없다(백엔드는 격자 단위만 준다) — deriveRecentRegions가 만든다.
 */
export interface RecentRegion {
  /** 행정동 이름 — 표시 라벨이자 묶음 키 (regionCode는 응답에 없다) */
  regionName: string;
  /** 그 동에서 수집한 격자 수 */
  gridCount: number;
  /** 그 동 격자들의 영상 수 합계 */
  videoCount: number;
  /** 그 동에서 가장 최근 업로드 시각 — 목록 정렬 키이자 "N시간 전" 표시 재료 */
  lastUploadedAt: string;
  /** 대표 격자 id — 동 클릭 시 by-grid로 regionCode를 얻는 입력 */
  sampleGridId: string;
}

/** 갤러리 본문의 격자 그룹 — 그룹 헤더(라벨·영상 수) + 그 격자의 영상 1열 (L5) */
export interface GalleryGridGroup {
  gridId: string;
  /** 격자 라벨 — zoneName+zoneCell, 구역 밖이면 상위 행정동 이름 폴백 */
  label: string;
  /** 그 격자의 영상 — 최신순 */
  videos: CollectedVideo[];
}

/**
 * 뱃지 카탈로그 항목 — `GET /api/badges` (획득+미획득 전체, MSG-430 L1).
 * 웹 `entities/dex/model/dex.ts`의 동명 타입 미러. `iconUrl`은 현재 서버가 전량 null이라
 * 로컬 메달 카탈로그(`entities/badge`)가 아트 정본이고, `featuredRank`는 대표 뱃지 1·2다
 * (미지정이면 null).
 */
export type DexBadge = Required<
  Pick<MyBadgeResponseDto, "badgeId" | "code" | "name" | "earned">
> &
  Pick<MyBadgeResponseDto, "iconUrl" | "earnedAt" | "featuredRank">;

/**
 * 날짜별 업로드 이력 항목 — `GET /api/collections/upload-history` (MSG-430 L4).
 * uploadDate는 KST 날짜 라벨("YYYY-MM-DD")이고 **희소 목록**이다 — 업로드가 없는 날은
 * 항목 자체가 없다(빈 날 0 채움은 `buildGrassWeeks` 파생 몫). uploadCount는 1 이상.
 */
export type UploadHistoryDay = Required<
  Pick<UploadHistoryResponseDto, "uploadDate" | "uploadCount">
>;
