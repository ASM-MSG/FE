/**
 * 개인 도감 [지도|뱃지] 전환 탭 모델 (MSG-299 AC 1) — 2026-08-05 시안 개정으로
 * 갤러리 탭이 제거돼 2개다. 칩 상태는 화면 로컬·비영속(추정 5 — 도감 탭 이탈 후
 * 재진입 시 지도 칩으로 리셋)이라 화면이 useState + 이 순수 모델로 보관한다
 * (zustand 미도입 환경 — 전역 구독 불필요).
 */

export type DexTab = "map" | "badge";

/** 도감 진입 시 기본 활성 탭 — 지도 (AC 1·5) */
export const DEFAULT_DEX_TAB: DexTab = "map";

/** 칩 렌더 목록 — [지도, 뱃지] 순서 고정 (AC 1) */
export const DEX_TAB_ITEMS: readonly { key: DexTab; label: string }[] = [
  { key: "map", label: "지도" },
  { key: "badge", label: "뱃지" },
];

/** 칩 선택 전이 — 선택한 탭이 곧 다음 상태 (재탭 포함, AC 1·11·12) */
export const selectDexTab = (_current: DexTab, key: DexTab): DexTab => key;
