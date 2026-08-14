import { describe, expect, it } from "vitest";
import * as mobileFormat from "./format";

/**
 * AC 5·7: 모바일 포맷 유틸 ↔ 웹 원본 동등성 (스펙 — 복제 + parity 테스트,
 * grid.parity.test.ts 선례). 웹 원본은 변수 경로 동적 import로 로드한다 —
 * formatRelativeTime 원본은 웹 shared/format.ts, formatViewCount 원본은 웹
 * widgets/cell-detail/model/cell-detail.ts (MSG-328에서 features/explore → widgets로 이동).
 * 후자는 내부에서 "@/shared/format" 별칭을 쓰므로 모바일 vitest.config의
 * "@" → 웹 src 별칭(parity 전용)이 전제다.
 * 웹 파일이 이동하면 이 테스트가 깨진다 — 의도된 드리프트 감지.
 */
const webPath = (rel: string) =>
  new URL(`../../../web/src/${rel}`, import.meta.url).pathname;

const loadWebFormat = (): Promise<{
  formatRelativeTime: typeof mobileFormat.formatRelativeTime;
}> => import(webPath("shared/format.ts"));

const loadWebCellDetail = (): Promise<{
  formatViewCount: typeof mobileFormat.formatViewCount;
}> => import(webPath("widgets/cell-detail/model/cell-detail.ts"));

describe("format 동등성 (AC 5·7)", () => {
  it("formatRelativeTime 결과가 웹 원본과 동일하다 — 방금/분/시간/일 경계", async () => {
    const web = await loadWebFormat();
    const now = new Date("2026-08-04T12:00:00+09:00");
    const samples = [
      "2026-08-04T11:59:30+09:00", // 1분 미만 → 방금 전
      "2026-08-04T11:55:00+09:00", // 5분 전
      "2026-08-04T09:00:00+09:00", // 3시간 전
      "2026-08-02T12:00:00+09:00", // 2일 전
      "2026-07-28T18:45:00+09:00",
    ];
    for (const iso of samples) {
      expect(mobileFormat.formatRelativeTime(iso, now)).toBe(
        web.formatRelativeTime(iso, now),
      );
    }
  });

  it("formatViewCount 결과가 웹 원본과 동일하다 — K/M 경계 포함", async () => {
    const web = await loadWebCellDetail();
    const samples = [
      0, 138, 999, 1000, 1400, 12000, 999_499, 999_500, 1_500_000,
    ];
    for (const count of samples) {
      expect(mobileFormat.formatViewCount(count)).toBe(
        web.formatViewCount(count),
      );
    }
  });
});
