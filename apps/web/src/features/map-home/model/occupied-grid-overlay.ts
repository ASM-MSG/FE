import { decodeGridCenter, decodeGridCorners } from "@/entities/cell";
import type { OccupiedGridResponseDto } from "@/shared/api/generated";
import { pointInPolygon, BUSAN_BOUNDARY } from "@/entities/region";
import type { StyledCellOverlay } from "./theme-overlay";

/**
 * 점령 격자 응답 → 지도 게시용 오버레이 셀 (MSG-325 → MSG-357 EPSG:5179).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 서버가 격자 단위로 응답하므로 gridId를 꼭짓점 4점으로 디코드하기만 하면 된다.
 */

/**
 * 부산 행정경계 안쪽 격자만 남겨 점령 스타일 오버레이로 변환한다.
 * 경계 필터를 유지하는 이유: 격자선이 부산 경계로 절단돼 있어(MSG-263 AC 3),
 * 필터를 빼면 격자선 없는 색칠 셀이 경계 밖에 뜬다.
 * 중심 판정은 gridId의 5179 셀 중심 역변환(decodeGridCenter — BE `center` 대응)이다.
 */
export const toOccupiedOverlays = (
  grids: OccupiedGridResponseDto[],
): StyledCellOverlay[] =>
  grids
    .filter((grid) =>
      pointInPolygon(decodeGridCenter(grid.gridId), BUSAN_BOUNDARY),
    )
    .map((grid) => ({
      id: grid.gridId,
      corners: decodeGridCorners(grid.gridId),
      occupied: true,
    }));
