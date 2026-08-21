import { describe, expect, it } from "vitest";
import {
  EMPTY_UPLOAD_HISTORY_MESSAGE,
  formatCollectedAt,
  formatCountTile,
  formatGallerySummary,
  formatGrassMeta,
  formatGroupVideoCount,
  formatRecentRegionMeta,
  formatSeqLabel,
  formatStreakTile,
  formatVideoCount,
  formatYearHeadline,
  formatYearSubtitle,
} from "./dex-format";
import type { GrassSummary } from "./upload-grass";

const NOW = new Date("2026-08-19T12:00:00+09:00");

/**
 * L11: `formatRecentRegionMeta(lastUploadedAt, videoCount, now)`가
 * `"2시간 전 · 영상 4개"`를 만든다 (`shared/format.formatRelativeTime` 재사용).
 */
describe("formatRecentRegionMeta — 동 행 보조 문구 (L11)", () => {
  it('"2시간 전 · 영상 4개" 형태로 조합한다 (L11)', () => {
    expect(formatRecentRegionMeta("2026-08-19T10:00:00+09:00", 4, NOW)).toBe(
      "2시간 전 · 영상 4개",
    );
  });

  it("1분 미만 업로드는 '방금 전'으로 표기된다 (L11 경계)", () => {
    expect(formatRecentRegionMeta("2026-08-19T11:59:30+09:00", 1, NOW)).toBe(
      "방금 전 · 영상 1개",
    );
  });
});

/**
 * L12: `formatGallerySummary(regionLabel, gridCount, videoCount)`가
 * `"부전2동 · 격자 6개 · 영상 11개"`를, `formatGroupVideoCount(n)`이 `"영상 4개"`를,
 * `formatCollectedAt(createdAt, now)`가 `"{상대시간} 수집"` 형태를 만든다.
 */
describe("갤러리 표시 문구 (L12)", () => {
  it('갤러리 요약은 "부전2동 · 격자 6개 · 영상 11개"다 (L12)', () => {
    expect(formatGallerySummary("부전2동", 6, 11)).toBe(
      "부전2동 · 격자 6개 · 영상 11개",
    );
  });

  it('격자 섹션 헤더 우측은 "영상 4개"다 (L12)', () => {
    expect(formatGroupVideoCount(4)).toBe("영상 4개");
    expect(formatVideoCount(4)).toBe("영상 4개");
  });

  it('수집 시점은 "{상대시간} 수집" 형태다 (L12)', () => {
    expect(formatCollectedAt("2026-08-18T12:00:00+09:00", NOW)).toBe(
      "1일 전 수집",
    );
    expect(formatCollectedAt("2026-08-16T12:00:00+09:00", NOW)).toBe(
      "3일 전 수집",
    );
  });

  it('수집 순번 칩은 "#4"다 (L12)', () => {
    expect(formatSeqLabel(4)).toBe("#4");
  });
});

/**
 * 통계 타일 값 표기 — 수집 격자·획득 뱃지는 `"6개"`, 연속 스트릭은 `"12일"`.
 * 구 `collection-format`의 `formatBadgeCount`를 개수 타일 공용으로 승계했고,
 * `formatStreak`의 🔥 이모지는 Figma 정본(값 `12일`)에 맞춰 제거했다 (추정 A6).
 */
describe("통계 타일 값 표기 (S2)", () => {
  it('개수 타일은 "6개"로 표기된다', () => {
    expect(formatCountTile(6)).toBe("6개");
    expect(formatCountTile(0)).toBe("0개");
  });

  it('스트릭 타일은 이모지 없이 "12일"로 표기된다 (추정 A6)', () => {
    expect(formatStreakTile(12)).toBe("12일");
  });
});

/**
 * 기록 탭·1년 화면 표시 문구 파생 (L7) — 수치는 전부 실데이터 파생이고,
 * 시안의 "48일·12일·128일·토요일"은 플레이스홀더다.
 */
const SUMMARY: GrassSummary = {
  uploadDayCount: 48,
  longestStreak: 12,
  maxDailyCount: 4,
  mostActiveWeekday: "토요일",
};

describe("기록 탭 메타 줄 (L7)", () => {
  it('"최근 24주 · N일 업로드 · 최장 연속 M일"로 표기된다', () => {
    expect(formatGrassMeta(24, SUMMARY)).toBe(
      "최근 24주 · 48일 업로드 · 최장 연속 12일",
    );
  });

  it("업로드가 0건이어도 같은 형태로 0을 표기한다 (경계)", () => {
    expect(
      formatGrassMeta(24, {
        uploadDayCount: 0,
        longestStreak: 0,
        maxDailyCount: 0,
        mostActiveWeekday: null,
      }),
    ).toBe("최근 24주 · 0일 업로드 · 최장 연속 0일");
  });
});

describe("1년 기록 화면 문구 (L7)", () => {
  it('헤드라인은 "지난 1년 동안 N일 업로드했어요"다', () => {
    expect(formatYearHeadline(SUMMARY)).toBe("지난 1년 동안 48일 업로드했어요");
  });

  it('부제는 "최장 연속 N일 · 하루 최다 M개 · 가장 활발한 요일 X"다', () => {
    expect(formatYearSubtitle(SUMMARY)).toBe(
      "최장 연속 12일 · 하루 최다 4개 · 가장 활발한 요일 토요일",
    );
  });

  it("가장 활발한 요일이 null이면 그 조각만 생략한다 (업로드 0건)", () => {
    expect(
      formatYearSubtitle({
        uploadDayCount: 0,
        longestStreak: 0,
        maxDailyCount: 0,
        mostActiveWeekday: null,
      }),
    ).toBe("최장 연속 0일 · 하루 최다 0개");
  });
});

describe("업로드 기록 빈 상태 문구 (L7, 승인 A4)", () => {
  it("승인된 문구 그대로다", () => {
    expect(EMPTY_UPLOAD_HISTORY_MESSAGE).toBe(
      "아직 업로드 기록이 없어요. 첫 영상을 올리면 여기에 쌓여요.",
    );
  });
});
