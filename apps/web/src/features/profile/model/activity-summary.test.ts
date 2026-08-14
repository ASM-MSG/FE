import { describe, expect, it } from "vitest";
import { deriveCollectionRate, formatStreakDays } from "./activity-summary";

const region = (collectedCount: number, totalCount: number) => ({
  collectedCount,
  totalCount,
});

describe("deriveCollectionRate — 방문한 행정동 전체의 수집률 (MSG-395)", () => {
  it("행정동별 수집·전체 격자를 합산해 백분율을 낸다", () => {
    expect(deriveCollectionRate([region(1, 100), region(2, 100)])).toBeCloseTo(
      1.5,
    );
  });

  it("한 곳도 방문하지 않았으면 0이다 (경계)", () => {
    expect(deriveCollectionRate([])).toBe(0);
  });

  it("전체 격자 합이 0이면 0이다 (경계 — 0 나눗셈)", () => {
    expect(deriveCollectionRate([region(0, 0)])).toBe(0);
  });

  it("전부 채웠으면 100이다 (경계)", () => {
    expect(deriveCollectionRate([region(10, 10)])).toBe(100);
  });

  it("서버 수치가 어긋나도 100을 넘기지 않는다 (경계 — 도감 clampPct와 같은 방어)", () => {
    expect(deriveCollectionRate([region(20, 10)])).toBe(100);
  });
});

describe("formatStreakDays — 연속 기록 표시 (MSG-395)", () => {
  it("일 단위로 적는다", () => {
    expect(formatStreakDays(3)).toBe("3일");
  });

  it("0일도 그대로 적는다 — 빈 값(—)과 구분된다 (경계)", () => {
    expect(formatStreakDays(0)).toBe("0일");
  });
});
