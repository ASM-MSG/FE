import { useOutletContext } from "react-router-dom";
import type { Bounds, LatLng } from "@/entities/cell";

/**
 * 지도 명령 API — 지속 셸(MapShell)이 오버레이(홈/탐색)에 주입한다.
 * 지도 인스턴스 제어를 오버레이에 노출하지 않고 명령만 공개한다.
 */
export interface MapShellContext {
  /** 지정 좌표로 지도 이동 */
  moveTo: (coords: LatLng) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /**
   * 지정 줌 단으로 이동 (MSG-395 AC 19) — 경로추천 칩이 축척 500m 단으로 맞춘다.
   * 값은 네이버 의미 체계(클수록 확대, 6~21)이고 범위 클램프는 지도 경계가 맡는다.
   */
  zoomTo: (zoom: number) => void;
  /** 지정 영역이 다 보이게 맞춘다 (MSG-403 후속) */
  fitBounds: (bounds: Bounds) => void;
  /** 현재 위치(폴백 시 서면)로 재이동 */
  locate: () => void;
}

/** 오버레이(Outlet 자식)에서 지도 명령 API를 받는 뷰-레이어 훅 */
export const useMapShell = () => useOutletContext<MapShellContext>();
