import type {
  CollectionGridResponseDto,
  CollectionSummaryResponseDto,
  MyBadgeResponseDto,
  RegionStatResponseDto,
  RegionVideoResponseDto,
} from "@/shared/api/generated/types.gen";

/*
 * MSG-289/327: 명세 대응 필드는 생성 타입(shared/api/generated)에서 type-only 파생한다.
 * MSG-327에서 mock 확장(nickname·avatarSrc·totalExploredPct·district·label·center)을 전부
 * 걷어냈다 — 프로필 축은 entities/profile(getMe)이, 격자 라벨은 features/region gridCardLabel이,
 * 좌표는 entities/cell decodeGridCenter가 소유한다. 남은 FE 확장은 "여러 응답을 합쳐야만
 * 생기는 화면 단위"(RecentRegion·GalleryGridGroup)뿐이다.
 */

/**
 * 개인 도감 요약 — `GET /api/collections/summary` (MSG-327 기준 2·3).
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
 * 내가 수집한 격자 — `GET /api/collections/grids` (MSG-327 기준 5).
 * gridId는 명세 체계 "{gridY}_{gridX}"다 (mock "A-14"는 MSG-327에서 폐기 — 기준 21).
 * regionName은 격자 중심 행정동이며 무귀속·미판정이면 null이라 동 묶음에서 제외된다 (기준 7).
 */
export type CollectedGrid = Required<
  Pick<
    CollectionGridResponseDto,
    "gridId" | "gridY" | "gridX" | "lastUploadedAt" | "videoCount"
  >
> &
  Pick<CollectionGridResponseDto, "regionName" | "zoneName" | "zoneCell">;

/**
 * 내가 수집한 개별 영상 — `GET /api/collections/videos?regionCode=` (MSG-327 기준 13).
 * 한 격자에 영상이 여러 개면 각각 별도 항목이다. zoneName·zoneCell은 격자 그룹 라벨 재료로,
 * 구역 밖이면 둘 다 null이라 상위 행정동 이름으로 폴백한다 (기준 12).
 */
export type CollectedVideo = Required<
  Pick<
    RegionVideoResponseDto,
    "videoId" | "gridId" | "durationSec" | "createdAt"
  >
> &
  Pick<RegionVideoResponseDto, "thumbnailUrl" | "zoneName" | "zoneCell">;

/**
 * 뱃지 카탈로그 항목 — `GET /api/badges` (MSG-327 기준 17~20).
 * code가 메달 아트 매핑 키이고, iconUrl은 백엔드 에셋 확정 전까지 전부 null이라
 * 프론트 로컬 에셋이 정본이다 (기준 19의 우선순위 로직 참조).
 */
export type DexBadge = Required<
  Pick<MyBadgeResponseDto, "badgeId" | "code" | "name" | "earned">
> &
  Pick<MyBadgeResponseDto, "iconUrl" | "earnedAt" | "featuredRank">;

/**
 * 행정동 수집률 — `GET /api/regions/stats/by-point`·`by-grid` (MSG-327 기준 4·11).
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
 * "최근 수집한 격자" 목록의 한 행 — 수집 격자를 행정동으로 묶은 FE 파생 단위 (기준 5·6).
 * 명세에 대응 응답이 없다(백엔드는 격자 단위만 준다) — deriveRecentRegions가 만든다.
 */
export interface RecentRegion {
  /** 행정동 이름 — 표시 라벨이자 묶음 키 (regionCode는 응답에 없다 — 기준 11 참조) */
  regionName: string;
  /** 그 동에서 수집한 격자 수 */
  gridCount: number;
  /** 그 동 격자들의 영상 수 합계 */
  videoCount: number;
  /** 그 동에서 가장 최근 업로드 시각 — 목록 정렬 키이자 "N시간 전" 표시 재료 */
  lastUploadedAt: string;
  /** 대표 격자 id — 동 클릭 시 by-grid로 regionCode를 얻는 입력 (기준 11) */
  sampleGridId: string;
}

/** 갤러리 본문의 격자 그룹 — 그룹 헤더(라벨·영상 수) + 그 격자의 영상 1열 (기준 12·13) */
export interface GalleryGridGroup {
  gridId: string;
  /** 격자 라벨 — zoneName+zoneCell, 구역 밖이면 상위 행정동 이름 폴백 */
  label: string;
  /** 그 격자의 영상 — 최신순 */
  videos: CollectedVideo[];
}
