import { create } from "zustand";

interface GalleryRegionState {
  /** 갤러리 뷰 지역 — null=지도 탭 본문(최근 수집 목록), 문자열=그 지역의 갤러리 뷰 (② B1) */
  selectedRegion: string | null;
  select: (region: string) => void;
  clear: () => void;
}

/**
 * 갤러리 지역 스토어 (MSG-122 AC 5, ② B1 개정).
 * selectedRegion이 갤러리 뷰 상태를 겸한다 — 갤러리는 탭이 아니라 지도 탭 내부 뷰이며
 * 진입 경로가 수집 셀·최근 수집 행 클릭뿐이라 URL은 관여하지 않는다(딥링크 없음).
 * 비영속(메모리) — 지도 탭 클릭(AC 22)·패널 언마운트(B4)에서 DexPanel이 clear해
 * 지도 본문으로 복귀한다. 라우터를 참조하지 않는다(RN 경계, recent-removal-store 선례).
 */
export const useGalleryRegionStore = create<GalleryRegionState>((set) => ({
  selectedRegion: null,
  select: (region) => set({ selectedRegion: region }),
  clear: () => set({ selectedRegion: null }),
}));
