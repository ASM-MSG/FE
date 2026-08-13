import { create } from "zustand";

/** 패널이 표시 중인 행정동 — reverse-geocode·전체 지역 리스트 응답에서 추린 최소 참조 */
export interface DisplayedRegion {
  regionCode: string;
  regionName: string;
}

/**
 * 표시 지역의 선택 출처 (사용자 보완 — 헤더 라이브 동기화):
 * auto = 현재 지도 중심 컨텍스트(자동 채택·장소 불러오기) — 헤더가 지도 이동을 따라간다.
 * manual = 전체 보기에서 명시 선택 — 선택 지역명이 헤더 정본.
 */
export type RegionOrigin = "auto" | "manual";

interface RegionPanelState {
  /**
   * 표시 중 행정동 — null이면 아직 채택 전(최초 reverse-geocode 대기 또는 행정동 밖).
   * 지도 이동으로 자동 갱신되지 않는다 — "장소 불러오기" 클릭·전체 보기 선택만 바꾼다
   * (사용자 기확정 해석 — 재검색 버튼 패턴).
   */
  displayedRegion: DisplayedRegion | null;
  /** 표시 지역의 선택 출처 — 헤더 표시명 선택(region-header)의 분기 근거 */
  origin: RegionOrigin;
  /** 패널 본문 모드 — 격자 카드 리스트 / 전체 지역 리스트 (AC 10) */
  mode: "grids" | "regions";
  /** 행정동을 표시한다 — 최초 채택·재검색(auto)·전체 보기 선택(manual) 공용. 격자 리스트 모드로 복귀한다 */
  showRegion: (region: DisplayedRegion, origin: RegionOrigin) => void;
  /** "전체 보기" — 패널 안 전체 지역 리스트를 연다 */
  openRegionList: () => void;
}

/**
 * 홈 좌측 패널의 지역 표시 상태 (MSG-328 AC 9·10) — 비영속 인메모리.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 */
export const useRegionPanelStore = create<RegionPanelState>((set) => ({
  displayedRegion: null,
  origin: "auto",
  mode: "grids",
  showRegion: (region, origin) =>
    set({ displayedRegion: region, origin, mode: "grids" }),
  openRegionList: () => set({ mode: "regions" }),
}));
