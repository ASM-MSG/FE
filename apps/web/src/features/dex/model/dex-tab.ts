/**
 * 도감 탭 경로 해석 (AC 2, 추정 A1 — 탭 전환을 URL에 반영).
 * MSG-122 ② 개정: 탭은 지도·뱃지 2개다 — 갤러리는 탭이 아니라 지도 탭 내부 뷰(B1,
 * gallery-region-store가 소유). "gallery"는 무효 파라미터로 지도 폴백된다(AC 21, Q2 —
 * /dex/gallery 딥링크 전용 처리 없음, /dex/foo와 동일 취급).
 * 순수 함수 — 라우터를 import하지 않는다(RN 경계). 파라미터 추출은 뷰(DexPanel)가 하고,
 * 이 모듈은 문자열 해석과 경로 생성만 담당한다. 탭 경로의 소유권은 이 파일에 있다
 * (ROUTES 상수는 무변경 — NavKey 타입 보존, 스펙 구현 계획).
 */

export const DEX_TABS = ["map", "badges"] as const;

export type DexTab = (typeof DEX_TABS)[number];

/** ROUTES.dex와 값 일치 — app 레이어 역참조를 피하기 위해 로컬 소유 */
const DEX_BASE_PATH = "/dex";

const isDexTab = (value: string): value is DexTab =>
  (DEX_TABS as readonly string[]).includes(value);

/** URL `:tab?` 파라미터 → 탭. 미지정(/dex)·무효 파라미터("gallery" 포함)는 지도 탭으로 폴백한다. [AC 2·21] */
export const parseDexTab = (param: string | undefined): DexTab =>
  param !== undefined && isDexTab(param) ? param : "map";

/** 탭 → 이동 경로: 지도→/dex, 뱃지→/dex/badges [AC 2] */
export const dexTabPath = (tab: DexTab): string =>
  tab === "map" ? DEX_BASE_PATH : `${DEX_BASE_PATH}/${tab}`;

/** 탭 표시 라벨 — 탭 버튼(DexTabs)이 사용 (자리 콘텐츠 안내는 MSG-123 뱃지 탭 구현으로 소멸) */
export const DEX_TAB_LABELS: Record<DexTab, string> = {
  map: "지도",
  badges: "뱃지",
};
