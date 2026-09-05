import type { Bounds, LatLng } from "./cell";

/**
 * 좌표 간 거리·중심 산술 — 격자 인코딩(EPSG:5179)과 무관한 순수 구면 기하.
 * 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * MSG-451: `features/map-home/model/course.ts`가 순환 코스 판정용으로만 갖고 있던
 * 하버사인을 엔티티로 올렸다 — 칩 최근접 진입(nearest-target)이 같은 산술을 쓰는데,
 * 코스 전용 모듈에서 꺼내 쓰면 "코스"라는 도메인 이름이 무관한 소비처에 딸려간다.
 */

const EARTH_RADIUS_METERS = 6_371_000;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** 두 좌표 사이 거리(m) — 하버사인 */
export const distanceMeters = (a: LatLng, b: LatLng): number => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
};

/**
 * 꼭짓점 묶음을 감싸는 경계 상자 (MSG-553) — 5179 격자 사각형은 위경도 평면에서 살짝
 * 기울어 있어(자오선 수렴) 남서·북동 2점만 보면 가장자리가 잘린다. 네 꼭짓점 전부의
 * min/max를 취하는 이 산술이 세 번째 소비처(관리자 심사 상세의 노출 범위 카메라)를
 * 만나 엔티티로 올렸다 — 하버사인을 `course.ts`에서 올린 MSG-451과 같은 판단이다.
 *
 * 기존 두 소비처(`features/search/model/zone-search.zoneBounds` ·
 * `features/map-home/model/mission`)의 이관은 후속 몫이다: 웨이브 3 병렬 티켓과
 * 겹치지 않는 자기 범위만 고친다는 계약이라 여기서는 새 소비처만 붙인다.
 */
export const cornersBounds = (corners: readonly LatLng[]): Bounds => {
  const lats = corners.map((corner) => corner.lat);
  const lngs = corners.map((corner) => corner.lng);
  return {
    sw: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    ne: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
};

/** 경계 상자의 중심 좌표 — 도형 하나를 대표하는 한 점 */
export const boundsCenter = ({ sw, ne }: Bounds): LatLng => ({
  lat: (sw.lat + ne.lat) / 2,
  lng: (sw.lng + ne.lng) / 2,
});
