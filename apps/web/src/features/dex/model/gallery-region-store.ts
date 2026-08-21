import { create } from "zustand";

/**
 * 갤러리 대상 동 (MSG-327 기준 10·11) — 표시 이름과 regionCode 조회 입력을 함께 든다.
 * `collections/grids` 응답에 regionCode가 없어서 동을 코드로 지목할 수 없다 —
 * 대신 그 동의 격자 하나를 들고 다니며 `by-grid`로 코드를 얻는다.
 */
export interface GallerySelection {
  regionName: string;
  /** 그 동에 속한 격자 id — by-grid로 regionCode를 얻는 입력 */
  gridId: string;
}

interface GalleryRegionState {
  /** 갤러리 뷰 대상 — null=지도 탭 본문(최근 수집 동 목록) (② B1) */
  selected: GallerySelection | null;
  select: (selection: GallerySelection) => void;
  clear: () => void;
}

/**
 * 갤러리 지역 스토어 (MSG-122 AC 5, ② B1 개정 → MSG-327 동 단위 전환).
 * selected가 갤러리 뷰 상태를 겸한다 — 갤러리는 탭이 아니라 지도 탭 내부 뷰이며
 * 진입 경로가 수집 격자 클릭·최근 수집 동 행 클릭뿐이라 URL은 관여하지 않는다(딥링크 없음).
 * 비영속(메모리) — 지도 탭 클릭·패널 언마운트에서 DexPanel이 clear해 본문으로 복귀한다.
 * 라우터를 참조하지 않는다(RN 경계, recent-removal-store 선례).
 */
export const useGalleryRegionStore = create<GalleryRegionState>((set) => ({
  selected: null,
  select: (selection) => set({ selected: selection }),
  clear: () => set({ selected: null }),
}));
