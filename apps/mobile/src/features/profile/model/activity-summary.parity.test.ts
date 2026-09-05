import { describe, expect, it } from "vitest";
import { deriveCollectionRate, formatStreakDays } from "./activity-summary";

/**
 * 템플릿 ① 순수 로직 — 프로필 "내 활동" 파생이 웹 원본과 동등하다 (MSG-564 기준 12, parity).
 * 웹 `features/profile/model/activity-summary.ts`를 동적 import해 같은 표본으로 대조한다 —
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 */
interface WebActivitySummaryModule {
  deriveCollectionRate: typeof deriveCollectionRate;
  formatStreakDays: typeof formatStreakDays;
}
const WEB_ACTIVITY_SUMMARY_PATH = new URL(
  "../../../../../web/src/features/profile/model/activity-summary.ts",
  import.meta.url,
).pathname;
const loadWebActivitySummary = (): Promise<WebActivitySummaryModule> =>
  import(WEB_ACTIVITY_SUMMARY_PATH);

/** 빈 목록·모수 0·통상·서버 수치 어긋남(100% 초과)·소수 — 두 구현이 갈릴 수 있는 길 전부 */
const regionSamples = [
  [],
  [{ collectedCount: 0, totalCount: 0 }],
  [{ collectedCount: 3, totalCount: 10 }],
  [
    { collectedCount: 3, totalCount: 10 },
    { collectedCount: 7, totalCount: 30 },
  ],
  [{ collectedCount: 12, totalCount: 10 }],
  [{ collectedCount: 1, totalCount: 3 }],
];

describe("내 활동 파생 동등성 (기준 12)", () => {
  it("수집률은 collectedCount/totalCount 합산 백분율이고 모수 0이면 0이다 (기준 12)", () => {
    expect(deriveCollectionRate([])).toBe(0);
    expect(
      deriveCollectionRate([
        { collectedCount: 3, totalCount: 10 },
        { collectedCount: 7, totalCount: 30 },
      ]),
    ).toBe(25);
  });

  it("서버 수치가 어긋나도 100을 넘지 않는다 — clampPct 방어 (기준 12)", () => {
    expect(deriveCollectionRate([{ collectedCount: 12, totalCount: 10 }])).toBe(
      100,
    );
  });

  it("스트릭은 `N일`이다 (기준 12)", () => {
    expect(formatStreakDays(12)).toBe("12일");
    expect(formatStreakDays(0)).toBe("0일");
  });

  it("deriveCollectionRate·formatStreakDays가 모든 표본에서 웹 원본과 동등하다 (기준 12, parity)", async () => {
    const web = await loadWebActivitySummary();

    for (const regions of regionSamples) {
      expect(deriveCollectionRate(regions)).toBe(
        web.deriveCollectionRate(regions),
      );
    }
    for (const days of [0, 1, 12, 365]) {
      expect(formatStreakDays(days)).toBe(web.formatStreakDays(days));
    }
  });
});
