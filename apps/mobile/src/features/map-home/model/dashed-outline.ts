/**
 * 선택 격자 점선 테두리 세그먼트 파생 (MSG-296 AC 2, 스펙 리스크 1).
 * SDK 폴리곤 outline은 점선 미지원이고, NaverMapPolylineOverlay(v2.9.0)는
 * pattern prop을 선언만 하고 네이티브 컴포넌트로 전달하지 않아(전달 누락)
 * 점선을 짧은 2점 폴리라인 목록으로 직접 그린다. 순수 함수 — 지도 SDK 비의존.
 */
import type { Bounds, LatLng } from "../../../entities/cell/model/grid";

/** 점선 한 조각 — 폴리라인 하나로 그릴 2점 선분 */
export type DashSegment = [LatLng, LatLng];

const lerp = (a: LatLng, b: LatLng, t: number): LatLng => ({
  lat: a.lat + (b.lat - a.lat) * t,
  lng: a.lng + (b.lng - a.lng) * t,
});

/**
 * 셀 bounds 사각형 둘레를 점선 세그먼트로 나눈다.
 * 변마다 dashesPerEdge개의 슬롯을 두고, 슬롯 앞부분 dashRatio 비율만큼을 dash로 채운다
 * (sw → se → ne → nw 순회, 첫 dash는 sw 코너에서 시작).
 */
export const buildDashedRectOutline = (
  bounds: Bounds,
  dashesPerEdge = 12,
  dashRatio = 0.6,
): DashSegment[] => {
  const { sw, ne } = bounds;
  const se: LatLng = { lat: sw.lat, lng: ne.lng };
  const nw: LatLng = { lat: ne.lat, lng: sw.lng };
  const edges: [LatLng, LatLng][] = [
    [sw, se],
    [se, ne],
    [ne, nw],
    [nw, sw],
  ];
  return edges.flatMap(([from, to]) =>
    Array.from({ length: dashesPerEdge }, (_, slot): DashSegment => {
      const start = slot / dashesPerEdge;
      return [
        lerp(from, to, start),
        lerp(from, to, start + dashRatio / dashesPerEdge),
      ];
    }),
  );
};
