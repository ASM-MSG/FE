import { cellCornersAt, decodeGridIndex } from "@/entities/cell";
import type { OccupiedGridResponseDto } from "@/shared/api/generated";
import type { StyledCellOverlay } from "./theme-overlay";

/**
 * 점령 격자 응답 → 지도 게시용 오버레이 셀 (MSG-325 → MSG-357 EPSG:5179).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 서버가 격자 단위로 응답하므로 gridId를 꼭짓점 4점으로 디코드하기만 하면 된다.
 */

/**
 * 점령 격자를 점령 스타일 오버레이로 변환한다 — 전국 gridId 그대로 (MSG-477 ③ C4).
 * 구 부산 경계 필터의 유지 근거는 "격자선이 부산 경계로 절단돼 있어 필터를 빼면 격자선
 * 없는 색칠 셀이 경계 밖에 뜬다"(MSG-263 AC 3)였는데, MSG-477에서 절단이 사라져 근거가
 * 소멸했다 — 필터를 남기면 부산 밖 점령 셀만 색칠되지 않는 신규 결함이 된다.
 */
export const toOccupiedOverlays = (
  grids: OccupiedGridResponseDto[],
): StyledCellOverlay[] =>
  grids.map((grid) => ({
    id: grid.gridId,
    corners: cellCornersAt(decodeGridIndex(grid.gridId)),
    occupied: true,
  }));
