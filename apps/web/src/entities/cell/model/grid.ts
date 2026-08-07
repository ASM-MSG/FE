import type { Bounds, LatLng } from "./cell";

/**
 * 100m급 격자 인코딩 — **서버 정본 규칙**(MSG-325).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 정본은 백엔드 `com.msg.fillmap.grid.GridConstants`·`GridEncoder`이고,
 * BE 글로서리("격자 계산 규칙")가 **FE·BE·모바일이 이 상수를 공유**한다고 규정한다.
 * 값을 바꾸면 전 격자 매핑이 바뀌므로 임의 변경 금지 — 서버와 함께 바꾼다.
 *
 * MSG-263이 쓰던 자체 원점(부산 bbox SW)·자체 스텝은 서버 격자와 부산 기준
 * 남북 19.4m·동서 36.9m 어긋나 있었다(MSG-325에서 교체). 그 D2 주석이 예고한
 * "서버 격자 체계가 정해지면 원점·인덱스 스킴을 서버 정의로 교체한다"의 이행이다.
 *
 * **정사각형이 아니다**: 위경도 등간격 양자화라 셀의 실제 미터 크기는 위도에 따라 다르다.
 * 남북은 어디서나 ≈100.2m, 동서는 `0.00115° × 111,320 × cos(위도)`로 부산 ≈104.7m다.
 */

/** 남북(위도) 스텝 — 서버 `GRID_LAT_STEP` */
export const GRID_LAT_STEP = 0.0009;

/** 동서(경도) 스텝 — 서버 `GRID_LNG_STEP`. 한국 위도에서 동서 폭이 ≈100m가 되도록 맞춘 값 */
export const GRID_LNG_STEP = 0.00115;

/**
 * 격자 원점 = 적도·본초자오선. 서버 인코딩이 `floor(lat / step)`으로 원점 보정 없이
 * 좌표를 그대로 나누므로 원점은 (0, 0)이다 — 뷰포트 산술(격자선·클러스터 윈도)이
 * 이 상수를 기준으로 계산하도록 이름으로 남겨 둔다.
 */
export const GRID_ORIGIN: LatLng = { lat: 0, lng: 0 };

/** 격자 셀 인덱스 — `col` = 서버 `gridX`(경도 기반), `row` = 서버 `gridY`(위도 기반) */
export interface GridCellIndex {
  col: number;
  row: number;
}

/** 좌표 → 소속 격자 셀 인덱스 (floor 반열림 — sw 변 포함, ne 변 미포함) */
export const cellIndexAt = (point: LatLng): GridCellIndex => ({
  col: Math.floor((point.lng - GRID_ORIGIN.lng) / GRID_LNG_STEP),
  row: Math.floor((point.lat - GRID_ORIGIN.lat) / GRID_LAT_STEP),
});

/** 격자 셀 인덱스 → 셀 Bounds(sw/ne) */
export const cellBoundsAt = (index: GridCellIndex): Bounds => ({
  sw: {
    lat: GRID_ORIGIN.lat + index.row * GRID_LAT_STEP,
    lng: GRID_ORIGIN.lng + index.col * GRID_LNG_STEP,
  },
  ne: {
    lat: GRID_ORIGIN.lat + (index.row + 1) * GRID_LAT_STEP,
    lng: GRID_ORIGIN.lng + (index.col + 1) * GRID_LNG_STEP,
  },
});

/**
 * 좌표 → 서버 격자 ID `"{gridY}_{gridX}"` (예: `"41642_110458"`).
 * 서버 `GridEncoder.encode`와 같은 식이며, 격자 정의는 `cellIndexAt` 하나를 공유한다.
 */
export const encodeGridId = (point: LatLng): string => {
  const { row, col } = cellIndexAt(point);
  return `${row}_${col}`;
};

/**
 * 서버 격자 ID → 셀 Bounds. 서버 `GridEncoder.bbox`의 sw/ne 대응.
 * 입력은 API 응답의 `gridId`이므로 포맷 방어는 두지 않는다(단순성 우선).
 */
export const decodeGridBounds = (gridId: string): Bounds => {
  const [row, col] = gridId.split("_").map(Number);
  return cellBoundsAt({ col, row });
};
