import { create } from "zustand";
import type { Bounds } from "@/entities/cell";

/** 패널이 표시 중인 행정동 — reverse-geocode·전체 지역 리스트 응답에서 추린 최소 참조 */
export interface DisplayedRegion {
  regionCode: string;
  regionName: string;
}

interface RegionPanelState {
  /**
   * 확정 행정동 — null이면 아직 채택 전(최초 reverse-geocode 대기 또는 행정동 밖).
   * 지도 이동으로 자동 갱신되지 않는다 — "장소 불러오기" 클릭·전체 보기 선택·최초 채택만 바꾼다.
   */
  displayedRegion: DisplayedRegion | null;
  /**
   * 확정 시점의 지도 영역 (MSG-403 AC 9) — 지도 데이터(핫구역·점령 격자·미션) 조회의
   * bbox 정본이다. 뷰포트를 그대로 쓰면 이동·줌마다 재조회가 나가 화면이 계속 다시 그려진다.
   */
  committedBounds: Bounds | null;
  /** 패널 본문 모드 — 격자 카드 리스트 / 전체 지역 리스트 (AC 10) */
  mode: "grids" | "regions";
  /**
   * 지역과 영역을 확정한다 — 최초 채택·재검색("장소 불러오기")·전체 보기 선택·칩 활성화
   * 공용 진입점. 격자 리스트 모드로 복귀한다.
   */
  commit: (region: DisplayedRegion, bounds: Bounds | null) => void;
  /**
   * 전체 보기에서 지역만 고른다 — **확정 영역은 건드리지 않는다** (codex 리뷰).
   * 이 목록에는 좌표가 없어(`/api/regions/explore` 응답) 지도를 그 지역으로 옮길 수 없다.
   * 그런데 현재 뷰포트를 함께 확정하면, 사용자가 지도를 옮겨둔 상태에서 목록의 다른 동을
   * 고르는 것만으로 미션·핫구역·점령 격자가 갱신된다 — "장소 불러오기로만 갱신"(AC 11)의
   * 우회로가 된다. 지역 리스트는 격자 카드 화면(regionCode 기반)만 바꾼다.
   */
  selectRegion: (region: DisplayedRegion) => void;
  /** "전체 보기" — 패널 안 전체 지역 리스트를 연다 */
  openRegionList: () => void;
  /** 전체 지역 리스트를 닫고 격자 리스트로 돌아간다 — 사이드레일 초기화(AC 16)의 대상 */
  closeRegionList: () => void;
}

/**
 * 홈 좌측 패널의 지역 표시 상태 (MSG-328 AC 9·10 → MSG-403 AC 9·13) — 비영속 인메모리.
 * 플랫폼 API(window/localStorage/router)를 참조하지 않는다 — RN 경계.
 *
 * MSG-403: 확정 지역에 **확정 영역(bounds)**이 붙었고, 선택 출처(origin)는 사라졌다 —
 * 헤더가 지도 이동을 따라가는 라이브 동기화(MSG-328 보완)를 되돌리면서 auto/manual을
 * 구분할 이유가 없어졌다. 헤더는 언제나 확정 지역명이다.
 */
export const useRegionPanelStore = create<RegionPanelState>((set) => ({
  displayedRegion: null,
  committedBounds: null,
  mode: "grids",
  commit: (region, bounds) =>
    set({ displayedRegion: region, committedBounds: bounds, mode: "grids" }),
  selectRegion: (region) => set({ displayedRegion: region, mode: "grids" }),
  openRegionList: () => set({ mode: "regions" }),
  closeRegionList: () => set({ mode: "grids" }),
}));
