import { describe, expect, it } from "vitest";
import { palette } from "@fillmap/design-tokens";
import type { ThemeGridEntry } from "./mock-theme-data";
import { buildThemeSheet, uploaderLabelFor } from "./theme-sheet";

const now = new Date("2026-08-04T15:00:00+09:00");

const grid = (overrides: Partial<ThemeGridEntry> = {}): ThemeGridEntry => ({
  cell: { col: 239, row: 192 },
  label: "서면 A-14",
  videoCount: 5,
  video: {
    durationSec: 42,
    isMine: true,
    uploadedAt: "2026-07-31T12:00:00+09:00",
    viewCount: 214,
  },
  ...overrides,
});

/**
 * AC 12: 배지의 N = 해당 테마 격자 목록 길이 — 시트 섹션 파생 함수가 테마 mock으로부터
 * {배지 N, 섹션 배열}을 정확히 만든다.
 * AC 14: 업로더 표기 규칙 — 내 영상이면 "내 영상", 타인 영상이면 @핸들.
 * AC 17: 격자 0개면 섹션 파생 함수가 빈 목록을 반환한다.
 */
describe("AC 12 테마 시트 파생 (theme-sheet.buildThemeSheet)", () => {
  it("배지 N = 격자 목록 길이, 섹션은 목록 순서대로 격자명·영상 수를 담는다", () => {
    const grids = [
      grid(),
      grid({
        cell: { col: 240, row: 193 },
        label: "전포 A-15",
        videoCount: 4,
        video: {
          durationSec: 17,
          isMine: false,
          uploaderHandle: "jeonpo_walk",
          uploadedAt: "2026-08-04T13:00:00+09:00",
          viewCount: 24_000,
        },
      }),
    ];
    const sheet = buildThemeSheet("hot", grids, now);
    expect(sheet.themeLabel).toBe("핫구역");
    expect(sheet.themeColor).toBe(palette["theme-hot"]);
    expect(sheet.badgeCount).toBe(2);
    expect(sheet.sections.map((s) => s.label)).toEqual([
      "서면 A-14",
      "전포 A-15",
    ]);
    expect(sheet.sections.map((s) => s.videoCount)).toEqual([5, 4]);
  });

  it("대표 영상 표시값을 파생한다 — 길이 초·업로더 표기·시점(AC 15 포맷)·조회수(AC 15 포맷)", () => {
    const sheet = buildThemeSheet("hot", [grid()], now);
    expect(sheet.sections[0].video).toEqual({
      durationSec: 42,
      isMine: true,
      uploaderLabel: "내 영상",
      uploadedAtLabel: "7월 31일",
      viewCountLabel: "조회 214",
    });
  });

  it("AC 17: 격자 0개면 배지 N = 0, 섹션은 빈 배열", () => {
    const sheet = buildThemeSheet("festival", [], now);
    expect(sheet.badgeCount).toBe(0);
    expect(sheet.sections).toEqual([]);
  });
});

describe("AC 14 업로더 표기 규칙 (theme-sheet.uploaderLabelFor)", () => {
  it('내 영상이면 "내 영상"', () => {
    expect(uploaderLabelFor({ isMine: true })).toBe("내 영상");
  });

  it("타인 영상이면 @핸들", () => {
    expect(
      uploaderLabelFor({ isMine: false, uploaderHandle: "jeonpo_walk" }),
    ).toBe("@jeonpo_walk");
  });
});
