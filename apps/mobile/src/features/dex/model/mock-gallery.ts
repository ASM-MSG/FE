/**
 * 갤러리 영상 mock (MSG-300 AC 1) — 부산 서면 기준, 서울 지명 금지.
 * 지역·개수 기반 생성으로 정의하되, MOCK_VISIT_RECORDS의 videoCount와의 정합은
 * 테스트(정합 가드)가 대조한다 — 개수 불일치가 컴파일이 아닌 테스트에서 잡히도록.
 * 필드는 id·regionName 최소 구조 (추정 5) — 실데이터 필드는 API 연동 티켓
 * (MSG-153 참조)에서 확장.
 */

export interface GalleryVideo {
  id: string;
  regionName: string;
}

/** 지역별 mock 영상 개수 — MOCK_VISIT_RECORDS와 정합 (AC 1, 테스트 가드) */
const GALLERY_REGION_COUNTS: readonly {
  regionName: string;
  idPrefix: string;
  count: number;
}[] = [
  { regionName: "부산진구 서면", idPrefix: "seomyeon", count: 12 },
  { regionName: "부산 해운대구", idPrefix: "haeundae", count: 7 },
];

/** 갤러리 영상 mock 19건 — 서면 12·해운대구 7 (AC 1·2) */
export const MOCK_GALLERY_VIDEOS: readonly GalleryVideo[] =
  GALLERY_REGION_COUNTS.flatMap(({ regionName, idPrefix, count }) =>
    Array.from({ length: count }, (_, index) => ({
      id: `${idPrefix}-${index + 1}`,
      regionName,
    })),
  );
