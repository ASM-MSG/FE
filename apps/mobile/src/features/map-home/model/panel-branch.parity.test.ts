import { describe, expect, it } from "vitest";
import { homePanelKind } from "./panel-branch";
import type { ThemeId } from "./themes";

/**
 * A1: `homePanelKind`가 격자 상세 > 미션/코스 상세 > 칩 목록 > 기본 순으로 값을 정하고,
 * `activeTheme="hot"`이면 `selectedMissionId`가 남아 있어도 `hot-region`을 반환한다
 * (MSG-427) — 웹 `features/map-home/model/panel-branch.ts` 원본 동등.
 */
const WEB_PANEL_BRANCH_PATH = new URL(
  "../../../../../web/src/features/map-home/model/panel-branch.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ homePanelKind: typeof homePanelKind }> =>
  import(WEB_PANEL_BRANCH_PATH);

const THEMES: (ThemeId | null)[] = [null, "hot", "festival", "popup", "route"];
const MISSION_IDS = [null, 7];
const GRID_IDS = [null, "16858_11420"];

describe("homePanelKind 웹 원본 동등성 (A1)", () => {
  it("격자 상세가 최우선이다 — 선택 격자가 있으면 어떤 테마·미션에서도 grid-detail", () => {
    for (const activeTheme of THEMES) {
      for (const selectedMissionId of MISSION_IDS) {
        expect(
          homePanelKind({
            activeTheme,
            selectedMissionId,
            selectedGridId: "16858_11420",
          }),
        ).toBe("grid-detail");
      }
    }
  });

  it("핫구역은 선택 미션이 남아 있어도 hot-region을 유지한다", () => {
    expect(
      homePanelKind({
        activeTheme: "hot",
        selectedMissionId: 7,
        selectedGridId: null,
      }),
    ).toBe("hot-region");
  });

  it("축제·팝업은 미션 선택 시 상세, 아니면 목록으로 간다", () => {
    for (const theme of ["festival", "popup"] as const) {
      expect(
        homePanelKind({
          activeTheme: theme,
          selectedMissionId: 7,
          selectedGridId: null,
        }),
      ).toBe("mission-detail");
      expect(
        homePanelKind({
          activeTheme: theme,
          selectedMissionId: null,
          selectedGridId: null,
        }),
      ).toBe("mission-list");
    }
  });

  it("경로추천은 course-detail·course-list, 칩 미선택은 region이다", () => {
    expect(
      homePanelKind({
        activeTheme: "route",
        selectedMissionId: 7,
        selectedGridId: null,
      }),
    ).toBe("course-detail");
    expect(
      homePanelKind({
        activeTheme: "route",
        selectedMissionId: null,
        selectedGridId: null,
      }),
    ).toBe("course-list");
    expect(
      homePanelKind({
        activeTheme: null,
        selectedMissionId: null,
        selectedGridId: null,
      }),
    ).toBe("region");
  });

  it("조합 전수에서 웹 원본과 같은 값을 낸다", async () => {
    const web = await loadWeb();

    for (const activeTheme of THEMES) {
      for (const selectedMissionId of MISSION_IDS) {
        for (const selectedGridId of GRID_IDS) {
          const input = { activeTheme, selectedMissionId, selectedGridId };
          expect(homePanelKind(input)).toBe(web.homePanelKind(input));
        }
      }
    }
  });
});
