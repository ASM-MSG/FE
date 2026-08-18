import { describe, expect, it } from "vitest";
import {
  mergePreferences,
  NOTIFICATION_CATEGORIES,
} from "./preference-catalog";

/**
 * 카테고리 카탈로그 병합 (MSG-409 AC 4·5, test-first) — 스펙 매핑 표가 정본.
 * WEEKLY 문구는 결정 1로 시안과 의도적으로 다르다("주간 리포트" — 서버 의미 교정).
 */
describe("mergePreferences — 카탈로그 순서·라벨 병합 (AC 4)", () => {
  it("서버 5종 응답을 매핑 표의 그룹·순서·라벨로 병합한다 (AC 4)", () => {
    const groups = mergePreferences([
      { category: "BADGE", enabled: true },
      { category: "HOTZONE", enabled: false },
      { category: "REMIND", enabled: true },
      { category: "VIDEO", enabled: true },
      { category: "WEEKLY", enabled: false },
    ]);

    expect(groups.map((g) => g.title)).toEqual(["활동 알림", "소식"]);
    expect(groups[0].items.map((i) => i.category)).toEqual([
      "VIDEO",
      "BADGE",
      "REMIND",
    ]);
    expect(groups[1].items.map((i) => i.category)).toEqual([
      "HOTZONE",
      "WEEKLY",
    ]);
    expect(groups[0].items.map((i) => i.label)).toEqual([
      "내 격자에 새 영상",
      "뱃지 획득",
      "스트릭 리마인더",
    ]);
    expect(groups[1].items.map((i) => i.label)).toEqual([
      "지역 축제 · 팝업",
      "주간 리포트",
    ]);
    expect(groups[1].items.map((i) => i.enabled)).toEqual([false, false]);
  });

  it("WEEKLY 설명은 결정 1의 확정 문구다 — 시안 '마케팅 · 혜택 정보' 기각 (AC 4)", () => {
    const groups = mergePreferences([]);

    const weekly = groups[1].items[1];
    expect(weekly.label).toBe("주간 리포트");
    expect(weekly.description).toBe("한 주의 수집 활동 요약을 주 1회");
  });

  it("서버 응답에 누락된 카테고리는 enabled=true다 — opt-out 기본 전부 on (AC 5)", () => {
    const groups = mergePreferences([{ category: "REMIND", enabled: false }]);

    const items = groups.flatMap((g) => g.items);
    expect(items.find((i) => i.category === "REMIND")?.enabled).toBe(false);
    expect(
      items.filter((i) => i.category !== "REMIND").map((i) => i.enabled),
    ).toEqual([true, true, true, true]);
  });

  it("빈 응답이면 5종 전부 true다 (AC 5 경계)", () => {
    const items = mergePreferences([]).flatMap((g) => g.items);

    expect(items).toHaveLength(5);
    expect(items.every((i) => i.enabled)).toBe(true);
  });
});

describe("NOTIFICATION_CATEGORIES — 서버 enum 5종 고정", () => {
  it("매핑 표 순서의 5종이다 (AC 4)", () => {
    expect(NOTIFICATION_CATEGORIES).toEqual([
      "VIDEO",
      "BADGE",
      "REMIND",
      "HOTZONE",
      "WEEKLY",
    ]);
  });
});
