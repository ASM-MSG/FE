import { describe, expect, it } from "vitest";
import type { CourseSpot } from "./course";
import { gridContextLine } from "./grid-context-line";

/**
 * C6·C7: 맥락 문구가 핫구역이면 `핫구역 안 N칸 · {날짜}부터 내가 점령 중`, 코스 스팟이면
 * `{코스명} N번째 스팟 · 방문 완료/미방문`으로 파생되고, **진행도 조회가 실패하면 방문
 * 여부 조각이 생략된다** (MSG-427) — 웹 원본 동등.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/grid-context-line.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{ gridContextLine: typeof gridContextLine }> =>
  import(WEB_PATH);

const SPOT: CourseSpot = {
  gridId: "16858_11420",
  position: { lat: 35.1578, lng: 129.0594 },
  order: 2,
  visited: true,
};

const INPUTS = [
  {
    spot: SPOT,
    courseTitle: "서면 산책 코스",
    isHotChip: false,
    hotGridCount: 0,
    collectedSinceLabel: null,
    progressFailed: false,
  },
  {
    spot: { ...SPOT, visited: false },
    courseTitle: "서면 산책 코스",
    isHotChip: false,
    hotGridCount: 0,
    collectedSinceLabel: null,
    progressFailed: false,
  },
  {
    spot: SPOT,
    courseTitle: "서면 산책 코스",
    isHotChip: false,
    hotGridCount: 0,
    collectedSinceLabel: null,
    progressFailed: true,
  },
  {
    spot: null,
    courseTitle: undefined,
    isHotChip: true,
    hotGridCount: 4,
    collectedSinceLabel: "8월 11일부터 내가 점령 중",
    progressFailed: false,
  },
  {
    spot: null,
    courseTitle: undefined,
    isHotChip: true,
    hotGridCount: 4,
    collectedSinceLabel: "8월 11일부터 내가 점령 중",
    progressFailed: true,
  },
  {
    spot: null,
    courseTitle: undefined,
    isHotChip: false,
    hotGridCount: 0,
    collectedSinceLabel: null,
    progressFailed: false,
  },
];

describe("gridContextLine 웹 원본 동등성 (C6·C7)", () => {
  it("코스 스팟이면 `{코스명} N번째 스팟 · 방문 완료/미방문`이다", () => {
    expect(gridContextLine(INPUTS[0])).toBe(
      "서면 산책 코스 2번째 스팟 · 방문 완료",
    );
    expect(gridContextLine(INPUTS[1])).toBe(
      "서면 산책 코스 2번째 스팟 · 미방문",
    );
  });

  it("진행도 조회가 실패하면 방문 여부 조각을 생략한다 — 미방문을 주장하지 않는다", () => {
    expect(gridContextLine(INPUTS[2])).toBe("서면 산책 코스 2번째 스팟");
    expect(gridContextLine(INPUTS[4])).toBe("핫구역 안 4칸");
  });

  it("핫구역이면 `핫구역 안 N칸 · {날짜}부터 내가 점령 중`, 그 외에는 줄이 없다", () => {
    expect(gridContextLine(INPUTS[3])).toBe(
      "핫구역 안 4칸 · 8월 11일부터 내가 점령 중",
    );
    expect(gridContextLine(INPUTS[5])).toBeUndefined();
  });

  it("표본 전건에서 웹 원본과 같은 문구를 낸다", async () => {
    const web = await loadWeb();

    for (const input of INPUTS) {
      expect(gridContextLine(input)).toBe(web.gridContextLine(input));
    }
  });
});
