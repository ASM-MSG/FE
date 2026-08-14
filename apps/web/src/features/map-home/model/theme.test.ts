import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import { THEME_META, THEME_ORDER } from "./theme";

/**
 * MSG-395: 목 테마 셀(MOCK_THEME_CELLS)·목 경로(MOCK_ROUTE)와 themeCellsOf가 실 미션 API
 * 전환으로 사라져 해당 정합 테스트도 함께 제거했다 — 지역축제·팝업스토어·경로추천의
 * 격자는 이제 `mission.ts`(missionGridIds)가 서버 shape에서 파생하고 그쪽 테스트가 덮는다.
 */

describe("테마 메타 — 칩 4개의 순서·라벨·색 (AC 1·3)", () => {
  it("칩은 핫구역 · 지역축제 · 팝업스토어 · 경로추천 순서다 (AC 1)", () => {
    expect(THEME_ORDER).toEqual(["hot", "festival", "popup", "route"]);
    expect(THEME_ORDER.map((id) => THEME_META[id].label)).toEqual([
      "핫구역",
      "지역축제",
      "팝업스토어",
      "경로추천",
    ]);
  });

  it("테마 색 4종은 design-tokens 신규 테마 토큰이다 — Figma 실측값 (AC 3, A1)", () => {
    // 값 고정: 스펙 A1 확정 — SEED v3 전환 시 토큰 값만 교체된다
    expect(palette["theme-hot"]).toBe("#FF3B30");
    expect(palette["theme-festival"]).toBe("#AF52DE");
    expect(palette["theme-popup"]).toBe("#FF9500");
    expect(palette["theme-route"]).toBe("#34C759");
    // 메타는 토큰을 경유해서만 색을 노출한다 (hex 임의값 금지)
    expect(THEME_META.hot.color).toBe(palette["theme-hot"]);
    expect(THEME_META.festival.color).toBe(palette["theme-festival"]);
    expect(THEME_META.popup.color).toBe(palette["theme-popup"]);
    expect(THEME_META.route.color).toBe(palette["theme-route"]);
  });
});
