/**
 * 개인 도감 [지도|뱃지|기록] 전환 탭 모델 (MSG-425 L10) — MSG-299의 2탭(map/badge)을
 * 3탭으로 개편했다. 키는 웹 `DEX_TABS`에 맞춰 `badge` → `badges`로 정정 (플랫폼 간
 * 탭 키 일치). 탭 상태는 화면 로컬·비영속(추정 A2 — 모바일에 `/dex/:tab` 라우트가 없고,
 * expo-router에 탭 세그먼트를 추가하면 MSG-430과 소유권이 충돌한다)이라 화면이
 * useState + 이 순수 모델로 보관한다. 순수 함수 — 라우터를 import하지 않는다(RN 경계).
 */

export type DexTab = "map" | "badges" | "history";

/** 도감 진입 시 기본 활성 탭 — 지도 [L10] */
export const DEFAULT_DEX_TAB: DexTab = "map";

/** 탭 pill 렌더 목록 — [지도, 뱃지, 기록] 순서 고정 [L10] */
export const DEX_TAB_ITEMS: readonly { key: DexTab; label: string }[] = [
  { key: "map", label: "지도" },
  { key: "badges", label: "뱃지" },
  { key: "history", label: "기록" },
];

/** 탭 선택 전이 — 선택한 탭이 곧 다음 상태 (활성 재탭 포함) [L10] */
export const selectDexTab = (_current: DexTab, key: DexTab): DexTab => key;
