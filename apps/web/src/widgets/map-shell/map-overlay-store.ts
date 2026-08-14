import { create } from "zustand";
import type {
  LabelOverlay,
  RouteOverlay,
  StyledCellOverlay,
} from "@/features/map-home/model/theme-overlay";

interface MapOverlayState {
  /**
   * 지도에 게시된 셀 오버레이 — 비어 있으면 지도는 기존 동작 그대로다(R3).
   * 스타일 필드(color·hatched) 미지정 셀은 기존 primary 렌더 (MSG-252 AC 13 — 도감 게시 불변).
   */
  cells: StyledCellOverlay[];
  /**
   * 경로 오버레이 (MSG-252 AC 8 → MSG-395 다중화) — 빈 배열이면 미표시.
   * 게시자는 홈(경로추천 활성 시)뿐이며, 목록에 뜬 코스 수만큼 라인이 함께 그려진다.
   */
  routes: RouteOverlay[];
  /** 이름표 마커 (MSG-395 AC 16·18·21) — 미션 호버·선택, 코스 목록에서 게시된다 */
  labels: LabelOverlay[];
  /**
   * 오버레이 셀 클릭 핸들러 (MSG-122 AC 14·18) — null이면 표시 전용(MSG-121 기존 동작, R3).
   * 게시자는 DexPanel(지도·갤러리 탭)·MapHomePage(MSG-252), 소비자는 MapShell → MapCanvas.
   */
  onCellClick: ((cellId: string) => void) | null;
  setCells: (cells: StyledCellOverlay[]) => void;
  setRoutes: (routes: RouteOverlay[]) => void;
  setLabels: (labels: LabelOverlay[]) => void;
  setOnCellClick: (handler: ((cellId: string) => void) | null) => void;
  clear: () => void;
}

/**
 * 오버레이 게시 스토어 (MSG-121 AC 9·11).
 * 게시자 패널(도감 — MSG-122 A3 / 홈 — MSG-252)이 마운트 시 set, 이탈 시 clear하고, MapShell이
 * 구독해 MapCanvas에 순수 데이터(id+Bounds)와 클릭 핸들러로 전달한다 — 지도 SDK를 import하지
 * 않는다(RN 경계). 원래 features/dex 소유였으나 홈(MSG-252)이 게시자로 추가되며 feature 간
 * 결합을 피해 소비자인 셸 위젯의 계약으로 이동했다 (스펙 R4 — sidebar-store 선례).
 * clear는 오버레이·경로·핸들러를 함께 해제한다 — 게시자 없는 섹션의 지도는 섹션 오버레이가 없다.
 * 격자선·상시 점령 셀(MSG-263 D9)은 이 스토어 소유가 아니다 — MapShell이 직접 파생·렌더하므로
 * 섹션 게시 해제(clear)가 격자·점령 상시 표시에 영향을 주지 않는다 (AC 18).
 */
export const useMapOverlayStore = create<MapOverlayState>((set) => ({
  cells: [],
  routes: [],
  labels: [],
  onCellClick: null,
  setCells: (cells) => set({ cells }),
  setRoutes: (routes) => set({ routes }),
  setLabels: (labels) => set({ labels }),
  setOnCellClick: (handler) => set({ onCellClick: handler }),
  clear: () => set({ cells: [], routes: [], labels: [], onCellClick: null }),
}));
