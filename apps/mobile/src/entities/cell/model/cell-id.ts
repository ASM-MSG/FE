/**
 * 격자 셀 id 인코딩 — 라우트 파라미터로 쓰는 플랫폼 중립 셀 식별자 (MSG-296 AC 1).
 * 지도 탭은 임의 셀에 닿을 수 있으므로 인덱스 자체를 id로 인코딩하고,
 * mock 등록 여부 판정은 상세 모델(features/grid-detail)이 인덱스 대조로 한다.
 * grid.ts는 웹 복제본(parity 계약)이라 모바일 전용 확장은 이 파일로 분리한다.
 */
import { cellBoundsAt, type GridCellIndex } from "./grid";
import { encodeGridId } from "./grid-5179";

/** 셀 인덱스 → "cell-{col}-{row}" (음수 인덱스 허용 — 예: "cell--3--7") */
export const cellIdFor = (index: GridCellIndex): string =>
  `cell-${index.col}-${index.row}`;

const CELL_ID_PATTERN = /^cell-(-?\d+)-(-?\d+)$/;

/** "cell-{col}-{row}" → 셀 인덱스. 인코딩 형식이 아니면 null */
export const parseCellId = (cellId: string): GridCellIndex | null => {
  const match = CELL_ID_PATTERN.exec(cellId);
  if (!match) return null;
  return { col: Number(match[1]), row: Number(match[2]) };
};

/**
 * 라우트 셀 id → 서버 격자 ID `"{gridY}_{gridX}"` (MSG-431 E). 형식 밖 id는 null.
 *
 * **두 격자 체계를 잇는 함수다.** 모바일 격자선·격자 탭·라우트는 아직 구 위경도 스텝
 * 체계(`grid.ts` — 원점 (0,0), 0.0009°/0.00115° 스텝)이고, 서버 `gridId`는 EPSG:5179
 * 100m 체계(`grid-5179.ts`)다. 원점도 셀 크기도 다르므로 **인덱스를 문자열로 재조합하는
 * 변환(`"{row}_{col}"`)은 성립하지 않는다** — 서면 셀이 부산에서 수백 km 떨어진 격자
 * id로 바뀐다(빌드 리포트 "스펙 이슈 1"). 유일하게 옳은 경로는 셀 중심 좌표를 5179로
 * 인코딩하는 것이고, 이 함수가 그 경로를 소유한다.
 *
 * 두 체계의 셀 경계가 정렬돼 있지 않으므로 변환은 "이 화면 셀의 중심이 속한 서버 격자"를
 * 뜻한다. 모바일 격자 전면 5179 이관(MSG-423 리스크 R2)이 끝나면 이 보정은 사라진다.
 */
export const serverGridIdFromCellId = (cellId: string): string | null => {
  const index = parseCellId(cellId);
  if (!index) return null;
  const { sw, ne } = cellBoundsAt(index);
  return encodeGridId({
    lat: (sw.lat + ne.lat) / 2,
    lng: (sw.lng + ne.lng) / 2,
  });
};
