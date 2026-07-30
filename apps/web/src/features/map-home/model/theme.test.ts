import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import { MOCK_CELLS } from "@/entities/cell";
import { MOCK_DEX } from "@/entities/dex";
import {
  MOCK_ROUTE,
  MOCK_THEME_CELLS,
  THEME_META,
  THEME_ORDER,
  themeCellsOf,
} from "./theme";

const OCCUPIED_IDS = MOCK_DEX.collectedCells.map((c) => c.cellId);

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

describe("목 테마 셀 — 부산 서면 기준 데이터 정합 (구현 계획, Figma 오탐 방지 4)", () => {
  it("모든 테마 셀 id는 MOCK_CELLS에 존재하고 중심 좌표가 동기화되어 있다 — 상세 라벨은 목 격자에서 파생 가능해야 한다", () => {
    const themed = [
      ...MOCK_THEME_CELLS.hot,
      ...MOCK_THEME_CELLS.festival,
      ...MOCK_THEME_CELLS.popup,
      ...MOCK_ROUTE.cells,
    ];
    for (const cell of themed) {
      const source = MOCK_CELLS.find((c) => c.id === cell.id);
      expect(source, `MOCK_CELLS에 없는 테마 셀 id: ${cell.id}`).toBeDefined();
      expect(cell.center).toEqual(source!.center);
    }
  });

  it("핫구역·지역축제·팝업스토어는 각각 내 점령 교집합 셀과 비교집합 셀을 최소 1개씩 가진다 — 빗금 구분(AC 7)이 시연 가능해야 한다", () => {
    for (const theme of ["hot", "festival", "popup"] as const) {
      const ids = MOCK_THEME_CELLS[theme].map((c) => c.id);
      expect(
        ids.some((id) => OCCUPIED_IDS.includes(id)),
        `${theme}: 교집합 셀 없음`,
      ).toBe(true);
      expect(
        ids.some((id) => !OCCUPIED_IDS.includes(id)),
        `${theme}: 비교집합 셀 없음`,
      ).toBe(true);
    }
  });

  it("목 경로는 번호 1·2·3 경유지와 이를 순서대로 잇는 연결선 정점, 주변 셀을 가진다 (AC 8)", () => {
    expect(MOCK_ROUTE.waypoints.map((w) => w.seq)).toEqual([1, 2, 3]);
    // 연결선은 경유지를 순서대로 지난다 — 꺾임 정점이 있어도 경유지 순서는 보존
    const positions = MOCK_ROUTE.waypoints.map((w) => w.position);
    const indexes = positions.map((p) =>
      MOCK_ROUTE.path.findIndex((v) => v.lat === p.lat && v.lng === p.lng),
    );
    expect(indexes.every((i) => i >= 0)).toBe(true);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
    expect(MOCK_ROUTE.cells.length).toBeGreaterThan(0);
  });
});

describe("themeCellsOf — 활성 테마의 강조 셀 목록 선택", () => {
  it("핫구역·지역축제·팝업스토어는 각 테마 셀 목록을 돌려준다", () => {
    expect(themeCellsOf("hot")).toBe(MOCK_THEME_CELLS.hot);
    expect(themeCellsOf("festival")).toBe(MOCK_THEME_CELLS.festival);
    expect(themeCellsOf("popup")).toBe(MOCK_THEME_CELLS.popup);
  });

  it("경로추천은 경로 주변 셀 목록을 돌려준다 (AC 8)", () => {
    expect(themeCellsOf("route")).toBe(MOCK_ROUTE.cells);
  });
});
