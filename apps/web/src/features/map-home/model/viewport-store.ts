import { create } from "zustand";
import type { Bounds, LatLng } from "@/entities/cell";
import { SEOMYEON_CENTER } from "@/shared/geolocation";

/** 지도 뷰포트 갱신 페이로드 */
export interface Viewport {
  center: LatLng;
  zoom: number;
  bounds: Bounds;
}

interface ViewportState {
  center: LatLng;
  /** 카카오맵 level 스케일 */
  zoom: number;
  /** 지도 준비 전에는 null */
  bounds: Bounds | null;
  setViewport: (viewport: Viewport) => void;
}

/**
 * 플랫폼 중립 뷰포트 스토어 — 지도 SDK를 import하지 않는다(RN 경계). [L5]
 * 지도 컴포넌트가 이동/줌 이벤트를 setViewport로 밀어 넣고,
 * 요약 패널 등은 이 스토어를 구독해 현재 보이는 영역을 파생한다.
 */
export const useViewportStore = create<ViewportState>((set) => ({
  center: SEOMYEON_CENTER,
  zoom: 5,
  bounds: null,
  setViewport: (viewport) => set(viewport),
}));
