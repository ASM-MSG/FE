/**
 * 시트 기본 화면의 "전체 보기" 모드·선택 지역 오버라이드 (MSG-571) — 웹
 * `region-panel-store` 상당의 feature 로컬 모듈 싱글턴(`grid-selection.ts` 관례).
 * 탭 왕복 재마운트를 넘겨야 하므로 화면 useState가 아니다.
 *
 * 웹과 다른 점: `committedBounds`·`commit`은 없다(모바일은 뷰포트가 곧 조회 bbox).
 * 모바일 헤더는 지도 이동을 따라 라이브로 바뀌므로(MSG-423) `selectedRegion`은 역지오코딩
 * 결과를 덮는 **오버라이드**이고, 지도 이동(`clearSelectedRegion`)으로 풀린다 (추정 2).
 *
 * 테스트 주의: 전역 싱글턴이므로 beforeEach에서 `resetRegionPanel()`로 리셋한다.
 */
import { useSyncExternalStore } from "react";

export interface SelectedRegion {
  regionCode: string;
  regionName: string;
}

export interface RegionPanelState {
  /** 시트 본문 모드 — 격자 카드 목록 / 전체 지역 목록 */
  mode: "grids" | "regions";
  /** 지역 행 탭으로 고른 지역 — null이면 지도 중심 행정동(역지오코딩)을 표시한다 */
  selectedRegion: SelectedRegion | null;
}

const INITIAL: RegionPanelState = { mode: "grids", selectedRegion: null };

let state: RegionPanelState = INITIAL;
const listeners = new Set<() => void>();

const update = (next: Partial<RegionPanelState>): void => {
  const merged = { ...state, ...next };
  if (
    merged.mode === state.mode &&
    merged.selectedRegion === state.selectedRegion
  )
    return;
  state = merged;
  for (const listener of listeners) listener();
};

export const getRegionPanel = (): RegionPanelState => state;

/** "전체 보기" — 시트 안 전체 지역 목록을 연다 */
export const openRegionList = (): void => update({ mode: "regions" });

/** ‹·하드웨어 back·홈 포커스 이탈 — 모드만 풀고 선택 지역은 유지한다 (웹 SideRailNav 미러) */
export const closeRegionList = (): void => update({ mode: "grids" });

/** 지역 행 탭 — 격자 모드로 복귀 + 표시 지역 교체. 지도는 움직이지 않는다 (웹 selectRegion) */
export const selectRegion = (region: SelectedRegion): void =>
  update({ mode: "grids", selectedRegion: region });

/** 지도 이동(뷰포트 변경) — 오버라이드만 풀어 헤더가 지도 중심 행정동으로 돌아간다 */
export const clearSelectedRegion = (): void => update({ selectedRegion: null });

/** 칩 탭·이벤트 칩 활성 — 둘 다 초기화 (웹 commit 미러) */
export const resetRegionPanel = (): void => update(INITIAL);

/** 구독 등록 — 반환 함수로 해제 (useSyncExternalStore 계약) */
export const subscribeRegionPanel = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** 홈 스크린용 구독 훅 */
export const useRegionPanel = (): RegionPanelState =>
  useSyncExternalStore(subscribeRegionPanel, getRegionPanel);
