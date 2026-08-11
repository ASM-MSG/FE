import proj4 from "proj4";
import type { Bounds, LatLng } from "./cell";

/**
 * 100m급 격자 인코딩 — **서버 정본 규칙**(MSG-357, EPSG:5179 전환).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(proj4js는 플랫폼 무관 — RN 재사용 대상).
 *
 * 정본은 백엔드 `GridConstants.CRS_DEF_EPSG5179`·`GridEncoder`(BE PR #134·#135, MSG-347)다.
 * 위경도(WGS84)를 EPSG:5179 미터 좌표로 변환해 `floor(x/100)`·`floor(y/100)`으로 셀을
 * 판정한다 — **계산은 5179, 렌더링은 4326**. 값·식을 바꾸면 전 격자 매핑이 바뀌므로
 * 임의 변경 금지 — 서버와 함께 바꾼다. 정합성은 BE 픽스처(grid-epsg5179-samples.json,
 * PROJ 9.3.0 생성·Proj4J 전수 일치본) 200건 전수 대조 테스트가 지킨다.
 *
 * MSG-325의 위경도 근사(원점 0,0 + 0.0009°/0.00115° 스텝)를 대체한다. 5179 셀은
 * 정확한 100m 정사각이지만 자오선 수렴 때문에 위경도 평면에서는 살짝 기울어진
 * 사각형이다 — sw/ne 2점 Bounds로는 복원할 수 없어 꼭짓점 4점(CellCorners)으로 다룬다.
 */

/** EPSG:5179 proj4 정의 — 서버 `GridConstants.CRS_DEF_EPSG5179`와 글자 단위 동일(정본) */
export const CRS_DEF_EPSG5179 =
  "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

/** 셀 한 변 길이(미터) — 서버 `cellSizeMeters` */
export const CELL_SIZE_METERS = 100;

/** WGS84 ↔ EPSG:5179 변환기 — 모듈 스코프 1회 생성 (proj4 정의 파싱 비용 반복 방지) */
const converter = proj4("WGS84", CRS_DEF_EPSG5179);

/** 위경도 → 5179 미터 좌표 [x, y] */
const toMeters = (point: LatLng): [number, number] =>
  converter.forward([point.lng, point.lat]);

/** 5179 미터 좌표 → 위경도 */
const toLatLng = (x: number, y: number): LatLng => {
  const [lng, lat] = converter.inverse([x, y]);
  return { lat, lng };
};

/** 격자 셀 인덱스 — 서버 `gridX`(동서, x 기반)·`gridY`(남북, y 기반) 명명 정렬 */
export interface GridCellIndex {
  gridX: number;
  gridY: number;
}

/** 셀 꼭짓점 4점 — 남서→남동→북동→북서 (BE `GridEncoder.bbox` 순서, 닫는 점 없음) */
export type CellCorners = [LatLng, LatLng, LatLng, LatLng];

/** 좌표 → 소속 격자 셀 인덱스 (floor 반열림 — 남서 변 포함, 북동 변 미포함) */
export const cellIndexAt = (point: LatLng): GridCellIndex => {
  const [x, y] = toMeters(point);
  return {
    gridX: Math.floor(x / CELL_SIZE_METERS),
    gridY: Math.floor(y / CELL_SIZE_METERS),
  };
};

/**
 * 좌표 → 서버 격자 ID `"{gridY}_{gridX}"`.
 * 서버 `GridEncoder.encode`(`cellIndex(y) + "_" + cellIndex(x)`)와 같은 식이며,
 * 격자 정의는 `cellIndexAt` 하나를 공유한다.
 */
export const encodeGridId = (point: LatLng): string => {
  const { gridX, gridY } = cellIndexAt(point);
  return `${gridY}_${gridX}`;
};

/**
 * 서버 격자 ID → 셀 인덱스.
 * 입력은 API 응답의 `gridId`이므로 포맷 방어는 두지 않는다(단순성 우선).
 */
export const decodeGridIndex = (gridId: string): GridCellIndex => {
  const [gridY, gridX] = gridId.split("_").map(Number);
  return { gridX, gridY };
};

/** 격자 교점(gridX·gridY 셀의 남서 꼭짓점 = 5179 (gridX·100, gridY·100))의 위경도 */
export const gridNodeAt = ({ gridX, gridY }: GridCellIndex): LatLng =>
  toLatLng(gridX * CELL_SIZE_METERS, gridY * CELL_SIZE_METERS);

/** 셀 인덱스 → 꼭짓점 4점 (남서→남동→북동→북서) — 5179 네 모서리를 각각 역변환 */
export const cellCornersAt = ({ gridX, gridY }: GridCellIndex): CellCorners => {
  const x0 = gridX * CELL_SIZE_METERS;
  const y0 = gridY * CELL_SIZE_METERS;
  const x1 = x0 + CELL_SIZE_METERS;
  const y1 = y0 + CELL_SIZE_METERS;
  return [
    toLatLng(x0, y0),
    toLatLng(x1, y0),
    toLatLng(x1, y1),
    toLatLng(x0, y1),
  ];
};

/** 셀 인덱스 → 셀 중심 좌표 — 5179 중심((gridX+0.5)·100, (gridY+0.5)·100)의 역변환 (BE `center` 대응) */
export const cellCenterAt = ({ gridX, gridY }: GridCellIndex): LatLng =>
  toLatLng((gridX + 0.5) * CELL_SIZE_METERS, (gridY + 0.5) * CELL_SIZE_METERS);

/** 서버 격자 ID → 꼭짓점 4점 */
export const decodeGridCorners = (gridId: string): CellCorners =>
  cellCornersAt(decodeGridIndex(gridId));

/** 서버 격자 ID → 셀 중심 좌표 */
export const decodeGridCenter = (gridId: string): LatLng =>
  cellCenterAt(decodeGridIndex(gridId));

/** 뷰포트가 걸치는 셀 인덱스 범위 (양끝 포함) */
export interface GridRange {
  minGridX: number;
  maxGridX: number;
  minGridY: number;
  maxGridY: number;
}

/**
 * 뷰포트(위경도 Bounds) → 셀 인덱스 범위 — 꼭짓점 4점을 각각 변환해 x·y 각각 min/max
 * (BE `GridEncoder.viewportRange` 대응). 자오선 수렴으로 격자가 기울어져 있어 남서·북동
 * 2점만 변환하면 가장자리 셀이 범위 밖으로 빠진다 — 반드시 4점 전부를 본다.
 */
export const viewportGridRange = ({ sw, ne }: Bounds): GridRange => {
  const corners = [
    toMeters(sw),
    toMeters({ lat: sw.lat, lng: ne.lng }),
    toMeters(ne),
    toMeters({ lat: ne.lat, lng: sw.lng }),
  ];
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  return {
    minGridX: Math.floor(Math.min(...xs) / CELL_SIZE_METERS),
    maxGridX: Math.floor(Math.max(...xs) / CELL_SIZE_METERS),
    minGridY: Math.floor(Math.min(...ys) / CELL_SIZE_METERS),
    maxGridY: Math.floor(Math.max(...ys) / CELL_SIZE_METERS),
  };
};
