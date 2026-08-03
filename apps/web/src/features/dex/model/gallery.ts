import type { CollectedCell, CollectedVideo } from "@/entities/dex";

/**
 * 갤러리 뷰 파생 로직 (MSG-122 AC 1·2·4).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 * resolveGalleryRegion(AC 3)은 ② 개정으로 제거 — 진입 경로가 셀·행 클릭뿐이라
 * 역지오코딩·디폴트 지역 폴백이 도달 불가한 죽은 코드였다 (B1·Q6 고아 정리).
 */

/**
 * 지정 지역(district) 격자의 영상만 createdAt 내림차순으로 선별한다. [AC 1]
 * 동률 시 videoId 오름차순 안정 정렬, 원본 배열은 변형하지 않는다(sortByCollectedAtDesc 패턴).
 * mock queryFn(fetchGalleryVideos)이 이 함수로 "서버 지역 필터"를 흉내 낸다 (A2).
 */
export const selectRegionVideos = (
  cells: CollectedCell[],
  videos: CollectedVideo[],
  region: string,
): CollectedVideo[] => {
  const regionCellIds = new Set(
    cells.filter((c) => c.district === region).map((c) => c.gridId),
  );
  return videos
    .filter((v) => regionCellIds.has(v.gridId))
    .sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || a.videoId - b.videoId,
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
 * gridId → 소속 지역(district). 수집 목록에 없는 id는 null — 오버레이 셀 클릭 no-op 방어. [AC 4]
 */
export const districtOfCell = (
  cells: CollectedCell[],
  cellId: string,
): string | null => cells.find((c) => c.gridId === cellId)?.district ?? null;
