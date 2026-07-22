/**
 * 도감 탭 경로 해석 (AC 2, 추정 A1 — 탭 전환을 URL에 반영).
 * 순수 함수 — 라우터를 import하지 않는다(RN 경계). 파라미터 추출은 뷰(DexPanel)가 하고,
 * 이 모듈은 문자열 해석과 경로 생성만 담당한다. 탭 경로의 소유권은 이 파일에 있다
 * (ROUTES 상수는 무변경 — NavKey 타입 보존, 스펙 구현 계획).
 */

export const DEX_TABS = ["map", "gallery", "badges"] as const;

export type DexTab = (typeof DEX_TABS)[number];

/** ROUTES.dex와 값 일치 — app 레이어 역참조를 피하기 위해 로컬 소유 */
const DEX_BASE_PATH = "/dex";

const isDexTab = (value: string): value is DexTab =>
  (DEX_TABS as readonly string[]).includes(value);

/** URL `:tab?` 파라미터 → 탭. 미지정(/dex)·무효 파라미터는 지도 탭으로 폴백한다. [AC 2] */
export const parseDexTab = (param: string | undefined): DexTab =>
  param !== undefined && isDexTab(param) ? param : "map";

/** 탭 → 이동 경로: 지도→/dex, 갤러리→/dex/gallery, 뱃지→/dex/badges [AC 2] */
export const dexTabPath = (tab: DexTab): string =>
  tab === "map" ? DEX_BASE_PATH : `${DEX_BASE_PATH}/${tab}`;

/** 탭 표시 라벨 — 탭 버튼과 자리 콘텐츠 안내가 공용으로 사용 */
export const DEX_TAB_LABELS: Record<DexTab, string> = {
  map: "지도",
  gallery: "갤러리",
  badges: "뱃지",
};
