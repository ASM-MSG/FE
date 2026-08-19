import {
  cellIndexAt,
  type GridCellIndex,
} from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";

/**
 * 모바일 격자 셀 → 서버 격자 id 역인덱스 (MSG-427 C3) — 순수 함수.
 * 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * 좌표계가 이원화돼 있다(스펙 R2): 모바일 격자선·격자 탭은 구 위경도 스텝 체계이고
 * 서버 격자는 EPSG:5179다. 탭 좌표를 5179로 인코딩하면 **격자선과 반 칸 어긋난 id**가
 * 나오므로, 화면에 실제로 올라온 격자(점령·핫구역·코스 스팟)의 gridId를 같은 스냅
 * 규칙(`toOccupiedCells`)으로 접어 역인덱스를 만들고 되돌린다.
 *
 * 역인덱스에 없는 셀은 상세가 열리지 않는데, 이는 `canOpenDetail` 게이트(C2)와 결과가
 * 같아 기능 손실이 아니다. 스냅 충돌(서로 다른 gridId 둘이 한 셀로 접힘) 시 첫 건만
 * 남는 것도 오버레이 렌더(`toMissionCells`)와 같은 규칙이다.
 */
export type CellGridIdIndex = ReadonlyMap<string, string>;

const keyOf = ({ col, row }: GridCellIndex): string => `${col}:${row}`;

/** 서버 격자 id 목록 → 모바일 셀 키 역인덱스. 같은 셀로 접히면 첫 건만 남는다. [C3] */
export const buildCellGridIdIndex = (gridIds: string[]): CellGridIdIndex => {
  const index = new Map<string, string>();
  for (const gridId of gridIds) {
    const key = keyOf(cellIndexAt(cellCenterAt(decodeGridIndex(gridId))));
    if (!index.has(key)) index.set(key, gridId);
  }
  return index;
};

/** 탭한 모바일 셀 → 서버 격자 id. 등재되지 않은 셀이면 null. [C3] */
export const gridIdOfCell = (
  index: CellGridIdIndex,
  cell: GridCellIndex,
): string | null => index.get(keyOf(cell)) ?? null;
