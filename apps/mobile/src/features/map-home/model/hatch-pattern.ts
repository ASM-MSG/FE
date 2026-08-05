/**
 * 교집합 셀 빗금 세그먼트 파생 (MSG-298 AC 9) — dashed-outline.ts와 같은 관례:
 * SDK 폴리곤이 패턴 채움을 지원하지 않아 셀 내부 대각선을 2점 폴리라인 목록으로 그린다.
 * 순수 함수 — 지도 SDK 비의존.
 */
import type { Bounds, LatLng } from "../../../entities/cell/model/grid";

/** 빗금 한 줄 — 폴리라인 하나로 그릴 2점 선분 */
export type HatchSegment = [LatLng, LatLng];

/**
 * 셀 bounds 안에 45°(정규화 좌표 기준) 대각선 빗금을 등간격으로 만든다.
 * 정규화 좌표 u(경도)·v(위도)에서 직선 v = u + c의 c를 -1~1 사이 등간격
 * (c_k = -1 + 2k/(n+1), k=1..n)으로 배치하고 단위 정사각형으로 절단한다 —
 * 끝점이 bounds 밖으로 나가지 않고, c=±1(길이 0)은 제외된다.
 */
export const buildHatchSegments = (
  bounds: Bounds,
  lineCount = 6,
): HatchSegment[] => {
  const { sw, ne } = bounds;
  const width = ne.lng - sw.lng;
  const height = ne.lat - sw.lat;
  const toLatLng = (u: number, v: number): LatLng => ({
    lat: sw.lat + v * height,
    lng: sw.lng + u * width,
  });
  return Array.from({ length: lineCount }, (_, i): HatchSegment => {
    const c = -1 + (2 * (i + 1)) / (lineCount + 1);
    const u1 = Math.max(0, -c);
    const u2 = Math.min(1, 1 - c);
    return [toLatLng(u1, u1 + c), toLatLng(u2, u2 + c)];
  });
};
