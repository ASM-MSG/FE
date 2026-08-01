import { describe, expect, it } from "vitest";
import { MOCK_CELLS, type CellVideo } from "@/entities/cell";
import { deriveUploadHourBuckets } from "./upload-hours";

/**
 * 업로드 시각 3시간×8버킷 집계 (MSG-277 2차 AC 9).
 * 로컬 시각 기준 — 픽스처는 로컬 Date 생성자로 ISO를 만들어 TZ 무관 결정성을 확보한다 (스펙 구현 계획).
 */

/** 로컬 시각 h시 m분의 ISO — new Date(y,mo,d,h)는 로컬 해석이라 getHours()로 되읽으면 TZ 무관 */
const localIso = (hour: number, minute = 0): string =>
  new Date(2026, 6, 30, hour, minute).toISOString();

const videoAt = (videoId: number, iso: string): CellVideo => ({
  videoId,
  title: "표본 영상",
  viewCount: 10,
  recordedAt: iso,
  durationSec: 30,
});

describe("deriveUploadHourBuckets — 3시간 단위 8버킷 집계 (AC 9)", () => {
  it("각 영상은 자기 로컬 시각의 버킷에 정확히 1회 집계된다 — 2시→0–3시, 14시→12–15시, 23시→21–24시", () => {
    const buckets = deriveUploadHourBuckets([
      videoAt(1, localIso(2)),
      videoAt(2, localIso(14)),
      videoAt(3, localIso(23)),
    ]);

    expect(buckets).toEqual([
      { startHour: 0, count: 1 },
      { startHour: 3, count: 0 },
      { startHour: 6, count: 0 },
      { startHour: 9, count: 0 },
      { startHour: 12, count: 1 },
      { startHour: 15, count: 0 },
      { startHour: 18, count: 0 },
      { startHour: 21, count: 1 },
    ]);
  });

  it("버킷 경계 정각은 시작 버킷에 속한다 — 3시 정각은 3–6시, 21시 정각은 21–24시", () => {
    const buckets = deriveUploadHourBuckets([
      videoAt(1, localIso(3)),
      videoAt(2, localIso(21)),
    ]);

    expect(buckets.find((b) => b.startHour === 3)?.count).toBe(1);
    expect(buckets.find((b) => b.startHour === 21)?.count).toBe(1);
    expect(buckets.find((b) => b.startHour === 0)?.count).toBe(0);
  });

  it("같은 버킷의 여러 영상은 누적된다 — 13시·13시 30분은 둘 다 12–15시", () => {
    const buckets = deriveUploadHourBuckets([
      videoAt(1, localIso(13)),
      videoAt(2, localIso(13, 30)),
    ]);

    expect(buckets.find((b) => b.startHour === 12)?.count).toBe(2);
  });

  it("버킷 count 합은 표본 수(cell.videos.length)와 같다 — 목 셀 실데이터 (AC 9)", () => {
    const cell = MOCK_CELLS.find((c) => c.id === "A-14");
    if (!cell) throw new Error("MOCK_CELLS에 A-14 없음");

    const buckets = deriveUploadHourBuckets(cell.videos);
    const total = buckets.reduce((sum, b) => sum + b.count, 0);

    expect(total).toBe(cell.videos.length);
  });

  it("빈 표본이면 8버킷 전부 count 0이다", () => {
    const buckets = deriveUploadHourBuckets([]);

    expect(buckets).toHaveLength(8);
    expect(buckets.map((b) => b.startHour)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });
});
