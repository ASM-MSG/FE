import type { Bounds, LatLng } from "../../../entities/cell/model/grid";

/**
 * 지도 뷰포트 페이로드 — 웹 `features/map-home/model/viewport-store.ts`의 `Viewport`
 * 타입만 이관한 것이다 (MSG-423 승인 Q4). 웹은 zustand 스토어로 전역 공유하지만,
 * 모바일은 지도(GridMap)와 소비처(map-home-screen)가 부모-자식 직결이라 화면 로컬
 * `useState`로 충분해 스토어를 만들지 않는다 — zustand 의존을 늘리지 않는다는
 * 기존 결정(auth-store·search-store 선례)과도 같다.
 *
 * 지도 SDK를 import하지 않는다 (RN 경계) — 지도 컴포넌트가 SDK 이벤트를 이 형태로
 * 번역해 올린다.
 */
export interface Viewport {
  center: LatLng;
  /** 네이버 지도 zoom 스케일 (6~21, 클수록 확대) */
  zoom: number;
  bounds: Bounds;
}
