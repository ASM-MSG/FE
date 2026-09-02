import { afterEach, describe, expect, it } from "vitest";
import {
  formatDuration,
  formatKstReceiptTime,
  formatMonthDay,
  formatViewCountKo,
} from "./format";

// 원래 features/explore/model/explore-cells.test.ts에 있던 검증 — 함수 이동(MSG-328)에 따라 함께 이동
describe("formatDuration — 영상 길이 m:ss 포맷", () => {
  it("초 값을 m:ss로 포맷한다", () => {
    expect(formatDuration(24)).toBe("0:24");
    expect(formatDuration(84)).toBe("1:24");
    expect(formatDuration(605)).toBe("10:05");
  });

  it("undefined이면 null을 반환한다(배지 미표시 신호)", () => {
    expect(formatDuration(undefined)).toBeNull();
  });
});

describe("formatMonthDay — ISO 시각 → 'M월 D일' 포맷 (AC 8)", () => {
  it("2026-07-21 시각을 '7월 21일'로 포맷한다", () => {
    expect(formatMonthDay("2026-07-21T12:00:00.000Z")).toBe("7월 21일");
  });

  it("한 자리 월·일은 앞자리 0 없이 표기한다 (2026-12-05 → '12월 5일')", () => {
    expect(formatMonthDay("2026-12-05T12:00:00.000Z")).toBe("12월 5일");
  });
});

describe("formatViewCountKo — 조회수 한국어 축약 (MSG-277 AC 6)", () => {
  it("1만 미만은 콤마 표기한다 (8410 → '8,410')", () => {
    expect(formatViewCountKo(8410)).toBe("8,410");
    expect(formatViewCountKo(640)).toBe("640");
    expect(formatViewCountKo(9999)).toBe("9,999");
  });

  it("1만 이상은 만 단위 소수 첫째 자리로 축약한다 (12000 → '1.2만')", () => {
    expect(formatViewCountKo(12000)).toBe("1.2만");
    expect(formatViewCountKo(24000)).toBe("2.4만");
  });

  it("만 단위 값이 정확히 떨어지면 소수 없이 표기한다 (10000 → '1만')", () => {
    expect(formatViewCountKo(10000)).toBe("1만");
  });

  it("만 단위 값이 10 이상이면 정수로 표기한다 (124000 → '12만')", () => {
    expect(formatViewCountKo(124000)).toBe("12만");
  });
});

describe("formatKstReceiptTime — 접수 시각 KST 상대/절대 혼합 표기 (MSG-552 AC 1)", () => {
  /** KST 2026-09-02 14:00 */
  const NOW = new Date("2026-09-02T05:00:00.000Z");

  it("KST 기준 오늘 접수분은 '오늘 HH:mm'으로 표기한다 (AC 1)", () => {
    expect(formatKstReceiptTime("2026-09-02T01:24:00.000Z", NOW)).toBe(
      "오늘 10:24",
    );
  });

  it("KST 기준 어제 접수분은 '어제 HH:mm'으로 표기한다 (AC 1)", () => {
    expect(formatKstReceiptTime("2026-09-01T07:10:00.000Z", NOW)).toBe(
      "어제 16:10",
    );
  });

  it("그 외 날짜는 'M.D HH:mm'으로 앞자리 0 없이 표기한다 (AC 1)", () => {
    expect(formatKstReceiptTime("2026-08-22T05:32:00.000Z", NOW)).toBe(
      "8.22 14:32",
    );
  });

  it("KST 자정 경계(UTC 15:00)를 날짜 전환점으로 판정한다 (AC 1, 경계)", () => {
    expect(formatKstReceiptTime("2026-09-01T15:00:00.000Z", NOW)).toBe(
      "오늘 00:00",
    );
    expect(formatKstReceiptTime("2026-09-01T14:59:00.000Z", NOW)).toBe(
      "어제 23:59",
    );
  });

  it("월 경계에서도 KST 날짜로 오늘·어제를 가른다 (AC 1, 경계)", () => {
    // KST 2026-09-01 11:00
    const monthEdgeNow = new Date("2026-09-01T02:00:00.000Z");

    expect(formatKstReceiptTime("2026-08-31T15:30:00.000Z", monthEdgeNow)).toBe(
      "오늘 00:30",
    );
    expect(formatKstReceiptTime("2026-08-31T14:00:00.000Z", monthEdgeNow)).toBe(
      "어제 23:00",
    );
  });

  describe("실행 환경 타임존과 무관하게 같은 결과다 (AC 1, TZ 변조)", () => {
    const originalTz = process.env.TZ;

    afterEach(() => {
      process.env.TZ = originalTz;
    });

    it.each(["UTC", "America/Los_Angeles", "Pacific/Kiritimati"])(
      "TZ=%s에서도 '8.22 14:32'다 (AC 1)",
      (tz) => {
        process.env.TZ = tz;

        expect(formatKstReceiptTime("2026-08-22T05:32:00.000Z", NOW)).toBe(
          "8.22 14:32",
        );
      },
    );
  });
});
