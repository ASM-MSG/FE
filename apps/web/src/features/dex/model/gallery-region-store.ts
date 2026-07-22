import { create } from "zustand";

interface GalleryRegionState {
  /** 셀 클릭으로 선택된 갤러리 지역 — null이면 현재 지역 폴백(resolveGalleryRegion) */
  selectedRegion: string | null;
  select: (region: string) => void;
  clear: () => void;
}

/**
 * 갤러리 지역 선택 스토어 (MSG-122 AC 5, A1).
 * 비영속(메모리) — 지역은 URL에 싣지 않는다: 티켓이 "딥링크 진입 시 현재 지역"을 명시해
 * URL 정본과 모순이기 때문(A1). 셀 클릭만 select하고, 갤러리 탭 "탭 클릭" 진입 시
 * DexPanel이 clear해 현재 지역으로 복귀한다 (AC 11).
 * 라우터를 참조하지 않는다(RN 경계, recent-removal-store 선례).
 */
export const useGalleryRegionStore = create<GalleryRegionState>((set) => ({
  selectedRegion: null,
  select: (region) => set({ selectedRegion: region }),
  clear: () => set({ selectedRegion: null }),
}));
