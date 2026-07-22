import { useOutletContext } from "react-router-dom";
import type { LatLng } from "@/entities/cell";

/**
 * 지도 명령 API — 지속 셸(MapShell)이 오버레이(홈/탐색)에 주입한다.
 * 지도 인스턴스 제어를 오버레이에 노출하지 않고 명령만 공개한다.
 */
export interface MapShellContext {
  /** 지정 좌표로 지도 이동 */
  moveTo: (coords: LatLng) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** 현재 위치(폴백 시 서면)로 재이동 */
  locate: () => void;
}

/** 오버레이(Outlet 자식)에서 지도 명령 API를 받는 뷰-레이어 훅 */
export const useMapShell = () => useOutletContext<MapShellContext>();
