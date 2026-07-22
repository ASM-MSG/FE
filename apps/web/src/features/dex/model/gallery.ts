import type { CollectedCell, CollectedVideo } from "@/entities/dex";
import { DEFAULT_REGION_NAME } from "./current-region";

/**
 * 갤러리 탭 파생 로직 (MSG-122 AC 1~4).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 * 지역 결정의 우선순위(셀 클릭 > 역지오코딩 > 디폴트)는 A1·A3의 합의를 코드로 옮긴 것이다.
 */

/**
 * 지정 지역(district) 격자의 영상만 collectedAt 내림차순으로 선별한다. [AC 1]
 * 동률 시 id 오름차순 안정 정렬, 원본 배열은 변형하지 않는다(sortByCollectedAtDesc 패턴).
 * mock queryFn(fetchGalleryVideos)이 이 함수로 "서버 지역 필터"를 흉내 낸다 (A2).
 */
export const selectRegionVideos = (
  cells: CollectedCell[],
  videos: CollectedVideo[],
  region: string,
): CollectedVideo[] => {
  const regionCellIds = new Set(
    cells.filter((c) => c.district === region).map((c) => c.cellId),
  );
  return videos
    .filter((v) => regionCellIds.has(v.cellId))
    .sort(
      (a, b) =>
        b.collectedAt.localeCompare(a.collectedAt) || a.id.localeCompare(b.id),
    );
};

/** 갤러리 기본 프리뷰 개수 (티켓 명시값) */
export const GALLERY_PREVIEW_LIMIT = 9;

/** 프리뷰 파생 결과 — 표시 목록 + "갤러리 전체 보기" 노출 여부 (A4) */
export interface GalleryPreview {
  videos: CollectedVideo[];
  /** 프리뷰 제한으로 잘린 항목이 있는가 — false면 전체 보기 버튼을 표시하지 않는다 (A4) */
  hasMore: boolean;
}

/**
 * 최신순 입력에서 프리뷰 9개 + hasMore를 파생한다. [AC 2]
 * 입력은 selectRegionVideos(또는 동일 계약의 서버 응답)의 최신순 정렬 결과를 전제한다.
 */
export const deriveGalleryPreview = (
  videos: CollectedVideo[],
): GalleryPreview => ({
  videos: videos.slice(0, GALLERY_PREVIEW_LIMIT),
  hasMore: videos.length > GALLERY_PREVIEW_LIMIT,
});

/**
 * cellId → 소속 지역(district). 수집 목록에 없는 id는 null — 오버레이 셀 클릭 no-op 방어. [AC 4]
 */
export const districtOfCell = (
  cells: CollectedCell[],
  cellId: string,
): string | null =>
  cells.find((c) => c.cellId === cellId)?.district ?? null;

/**
 * 갤러리 표시 지역 결정: 셀 클릭 선택 > 역지오코딩 결과 > 디폴트 "중구". [AC 3, A1]
 * 셀 클릭 선택은 gallery-region-store, 역지오코딩은 use-current-region이 소유하고
 * 여기는 해석만 담당한다 (resolveCurrentRegion 패턴).
 */
export const resolveGalleryRegion = (
  selected: string | null,
  lookup: string | null,
): string => selected ?? lookup ?? DEFAULT_REGION_NAME;
