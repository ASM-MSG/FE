import type { Bounds, LatLng } from "@/entities/cell";

/**
 * 수집 격자 → 지도 오버레이 기하 변환 (AC 9·10).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 렌더링(kakao Polygon)은 MapCanvas 경계 안에서 하고, 여기는 데이터만 만든다.
 */

/**
 * 격자 한 변 길이(m) — mock 상수 (추정 A4, 리스크 R2).
 * 격자 지오메트리 정의가 기획·코드베이스 어디에도 없어 500m로 가정한다.
 * 실 API 전환 시 서버 제공 bounds로 교체하고 이 상수는 제거한다.
 */
export const CELL_SIDE_METERS = 500;

/** 위도 1도당 미터 (지구 자오선 기준 근사) — 경도는 위도별 cos 보정을 거친다 */
export const METERS_PER_DEGREE_LAT = 111_320;

/** 지도에 게시할 수집 오버레이 한 칸 — 순수 데이터(id + Bounds), MapCanvas prop 계약 */
export interface CellOverlay {
  id: string;
  bounds: Bounds;
}

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/**
 * 격자 중심 좌표 + 한 변 길이(m) → 사각 Bounds(sw/ne). [AC 10]
 * 위도 스팬은 자오선 근사로, 경도 스팬은 해당 위도의 cos 보정으로 계산한다 —
 * 고위도일수록 경도 1도가 짧아지므로 도(degree) 스팬은 넓어진다.
 */
export const cellToBounds = (center: LatLng, sideMeters: number): Bounds => {
  const halfLat = sideMeters / 2 / METERS_PER_DEGREE_LAT;
  const halfLng = halfLat / Math.cos(toRadians(center.lat));
  return {
    sw: { lat: center.lat - halfLat, lng: center.lng - halfLng },
    ne: { lat: center.lat + halfLat, lng: center.lng + halfLng },
  };
};
