import { describe, expect, it } from "vitest";
import {
  formatCollectedAt,
  formatCountTile,
  formatGallerySummary,
  formatGroupVideoCount,
  formatRecentRegionMeta,
  formatSeqLabel,
  formatStreakTile,
  formatVideoCount,
} from "./dex-format";

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
