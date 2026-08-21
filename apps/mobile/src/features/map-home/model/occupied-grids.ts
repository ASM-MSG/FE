import type { OccupiedGridResponseDto } from "../../../shared/api/sdk";
import {
  cellIndexAt,
  type GridCellIndex,
} from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";

/**
 * 점령 격자 응답 → 지도에 칠할 모바일 격자 인덱스 (MSG-423, 웹
 * `features/map-home/model/occupied-grid-overlay.ts`의 적응 포팅).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * 웹은 `gridId → 5179 꼭짓점 4점`을 그대로 그리지만, 모바일 격자선은 아직 구 위경도
 * 스텝 체계라 그대로 그리면 격자선과 어긋나 보인다. 그래서 **5179 셀 중심을 모바일
 * 격자 인덱스로 스냅**한다 (승인 Q2 A안 — 셀 크기 차로 드물게 인접 셀로 스냅될 수 있는
 * 표시 근사를 감수한다. 모바일 격자 5179 전면 이관은 후속 티켓).
 *
 * 웹이 갖는 부산 행정경계 필터는 **의도적으로 뺐다** — 그 필터의 존재 이유가 "웹 격자선이
 * 부산 경계로 절단돼 있어 필터 없이는 격자선 없는 색칠 셀이 뜬다"인데, 모바일 격자선은
 * 절단하지 않으므로 같은 문제가 없다.
 *
 * 중복 판정은 **스냅 이후의 모바일 셀 인덱스** 기준이다(gridId 기준이 아니다):
 * 5179 셀은 100m 정사각인데 모바일 경도 스텝은 부산 위도에서 약 104m라, 두 체계의
 * 경계가 어긋나는 지점에서 **서로 다른 gridId 둘이 한 모바일 셀로 스냅된다**. gridId로만
 * 접으면 같은 인덱스가 그대로 통과해 폴리곤이 겹쳐 그려지고 GridMap의 셀 key가 충돌한다
 * (codex 리뷰 P2-2 — 근사의 직접적 귀결이라 스냅 뒤에서 접는 것이 옳다).
 */
export const toOccupiedCells = (
  grids: OccupiedGridResponseDto[],
): GridCellIndex[] => {
  const seen = new Set<string>();
  const cells: GridCellIndex[] = [];
  for (const grid of grids) {
    const cell = cellIndexAt(cellCenterAt(decodeGridIndex(grid.gridId)));
    // 같은 셀로 접히는 입력(중복 gridId + 근사로 충돌한 이웃 격자)은 첫 건만 남긴다
    const key = `${cell.col}:${cell.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push(cell);
  }
  return cells;
};
