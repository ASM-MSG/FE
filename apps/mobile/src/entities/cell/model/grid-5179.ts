import proj4 from "proj4";
import type { Bounds, LatLng } from "./grid";

/**
 * EPSG:5179 100m 격자 디코드 — 웹 `apps/web/src/entities/cell/model/grid.ts`에서
 * 서버 응답 해석에 필요한 3종(decodeGridIndex·cellCenterAt·cellCornersAt)만 옮긴 복제본
 * (MSG-423 승인 Q2 A안). 동등성은 grid-5179.parity.test.ts가 웹 원본을 동적 import해
 * 단정한다 — 웹이 바뀌면 이 테스트가 깨져 드리프트를 감지한다.
 *
 * 정본은 백엔드 `GridConstants.CRS_DEF_EPSG5179`·`GridEncoder`다. 값·식을 바꾸면 전
 * 격자 매핑이 바뀌므로 임의 변경 금지 — 서버·웹과 함께 바꾼다.
 *
 * **좌표계 이원화 주의**: 모바일 격자선·격자 탭·격자 상세 라우트는 아직 구 위경도 스텝
 * 체계(`grid.ts`)다. 이 파일은 서버 점령 격자 응답을 그 체계로 정규화하기 위한 디코드
 * 전용이고(occupied-grids.ts), 인코딩(좌표 → gridId)은 옮기지 않았다.
 * 모바일 격자 전면 5179 이관은 후속 티켓이다 (스펙 리스크 R2).
 */

/** EPSG:5179 proj4 정의 — 서버 `GridConstants.CRS_DEF_EPSG5179`와 글자 단위 동일(정본) */
export const CRS_DEF_EPSG5179 =
  "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

/** 셀 한 변 길이(미터) — 서버 `cellSizeMeters` */
export const CELL_SIZE_METERS = 100;

/** WGS84 ↔ EPSG:5179 변환기 — 모듈 스코프 1회 생성 (proj4 정의 파싱 비용 반복 방지) */
const converter = proj4("WGS84", CRS_DEF_EPSG5179);

/** 5179 미터 좌표 → 위경도 */
const toLatLng = (x: number, y: number): LatLng => {
  const [lng, lat] = converter.inverse([x, y]);
  return { lat, lng };
};

/** 5179 격자 셀 인덱스 — 서버 `gridX`(동서, x 기반)·`gridY`(남북, y 기반) 명명 정렬 */
export interface Grid5179Index {
  gridX: number;
  gridY: number;
}

/** 셀 꼭짓점 4점 — 남서→남동→북동→북서 (BE `GridEncoder.bbox` 순서, 닫는 점 없음) */
export type CellCorners = [LatLng, LatLng, LatLng, LatLng];

/**
 * 서버 격자 ID `"{gridY}_{gridX}"` → 셀 인덱스.
 * 입력은 API 응답의 `gridId`이므로 포맷 방어는 두지 않는다(단순성 우선 — 웹 원본 동일).
 */
export const decodeGridIndex = (gridId: string): Grid5179Index => {
  const [gridY, gridX] = gridId.split("_").map(Number);
  return { gridX, gridY };
};

/** 셀 인덱스 → 꼭짓점 4점 (남서→남동→북동→북서) — 5179 네 모서리를 각각 역변환 */
export const cellCornersAt = ({ gridX, gridY }: Grid5179Index): CellCorners => {
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
export const cellCenterAt = ({ gridX, gridY }: Grid5179Index): LatLng =>
  toLatLng((gridX + 0.5) * CELL_SIZE_METERS, (gridY + 0.5) * CELL_SIZE_METERS);

/** 위경도 → 5179 미터 좌표 [x, y] */
const toMeters = (point: LatLng): [number, number] =>
  converter.forward([point.lng, point.lat]);

/**
 * 좌표 → 소속 5179 격자 셀 인덱스 (floor 반열림 — 남서 변 포함, 북동 변 미포함).
 * 웹 `entities/cell/model/grid.ts`의 `cellIndexAt` 복제본이다. 모바일 `grid.ts`에
 * 같은 이름의 **구 위경도 스텝** 함수가 이미 있어(좌표계 이원화, 스펙 R2) 이름을 나눈다.
 */
const grid5179IndexAt = (point: LatLng): Grid5179Index => {
  const [x, y] = toMeters(point);
  return {
    gridX: Math.floor(x / CELL_SIZE_METERS),
    gridY: Math.floor(y / CELL_SIZE_METERS),
  };
};

/**
 * 좌표 → 서버 격자 ID `"{gridY}_{gridX}"` (MSG-427 승인 Q5 — 미션 영역 타일 렌더).
 * 서버 `GridEncoder.encode`·웹 `encodeGridId`와 같은 식이며 동등성은
 * encode-grid-id.parity.test.ts가 고정한다.
 */
export const encodeGridId = (point: LatLng): string => {
  const { gridX, gridY } = grid5179IndexAt(point);
  return `${gridY}_${gridX}`;
};

/** 뷰포트가 걸치는 5179 셀 인덱스 범위 (양끝 포함) */
export interface GridRange {
  minGridX: number;
  maxGridX: number;
  minGridY: number;
  maxGridY: number;
}

/**
 * 뷰포트(위경도 Bounds) → 5179 셀 인덱스 범위 (MSG-427 승인 Q5 · F-12 클리핑의 근거).
 * 꼭짓점 4점을 각각 변환해 x·y 각각 min/max를 잡는다 — 자오선 수렴으로 격자가 위경도
 * 평면에서 기울어져 있어 남서·북동 2점만 변환하면 가장자리 셀이 범위 밖으로 빠진다.
 * 웹 `viewportGridRange`의 복제본 (viewport-grid-range.parity.test.ts가 동등성 고정).
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
