import { describe, expect, it } from "vitest";
import { MOCK_CELLS } from "@/entities/cell";
import { MOCK_COLLECTED_VIDEOS, MOCK_DEX } from "./mock-dex";

/**
 * mock 정합성 (AC 6, A6·A7·A9) — 갤러리 mock이 도감 mock과 모순되지 않음을 고정한다.
 * 값 자체가 아니라 불변식을 단정한다 — mock 수치 조정 시 이 규칙만 지키면 된다.
 */
describe("갤러리 mock 정합성 (AC 6)", () => {
  it("격자별 갤러리 영상 수가 CollectedCell.videoCount와 일치한다", () => {
    for (const cell of MOCK_DEX.collectedCells) {
      const count = MOCK_COLLECTED_VIDEOS.filter(
        (v) => v.cellId === cell.cellId,
      ).length;
      expect(count, `${cell.cellId} 영상 수`).toBe(cell.videoCount);
    }
  });

  it("모든 영상의 cellId가 수집 격자 목록에 존재한다", () => {
    const collectedIds = new Set(
      MOCK_DEX.collectedCells.map((c) => c.cellId),
    );
    for (const video of MOCK_COLLECTED_VIDEOS) {
      expect(collectedIds.has(video.cellId), `${video.id}의 cellId`).toBe(true);
    }
  });

  it("격자별 min(영상 collectedAt)이 격자 collectedAt과 같다 — 첫 영상 수집 = 격자 수집 (A9)", () => {
    for (const cell of MOCK_DEX.collectedCells) {
      const times = MOCK_COLLECTED_VIDEOS.filter(
        (v) => v.cellId === cell.cellId,
      ).map((v) => v.collectedAt);
      const oldest = [...times].sort()[0];
      expect(oldest, `${cell.cellId} 최고령 영상 시각`).toBe(cell.collectedAt);
    }
  });

  it("부산진구 영상 합계가 9를 넘는다 — 프리뷰 제한·전체 보기 시연 가능 (A6)", () => {
    const busanjinCellIds = new Set(
      MOCK_DEX.collectedCells
        .filter((c) => c.district === "부산진구")
        .map((c) => c.cellId),
    );
    const busanjinCount = MOCK_COLLECTED_VIDEOS.filter((v) =>
      busanjinCellIds.has(v.cellId),
    ).length;
    expect(busanjinCount).toBeGreaterThan(9);
  });

  it("모든 수집 영상 id가 소속 격자 Cell.videos의 id로 존재한다 — 상세 시트 활성 매칭 정합 (② B3, AC 6 추가)", () => {
    for (const video of MOCK_COLLECTED_VIDEOS) {
      const cell = MOCK_CELLS.find((c) => c.id === video.cellId);
      expect(
        cell?.videos.some((v) => v.id === video.id),
        `${video.id}가 ${video.cellId}의 Cell.videos에 존재`,
      ).toBe(true);
    }
  });

  it("썸네일 제공 항목과 미제공 항목이 모두 존재한다 — placeholder 경로 검증 가능 (A7)", () => {
    expect(
      MOCK_COLLECTED_VIDEOS.some((v) => v.thumbnailSrc !== undefined),
    ).toBe(true);
    expect(
      MOCK_COLLECTED_VIDEOS.some((v) => v.thumbnailSrc === undefined),
    ).toBe(true);
  });

  it("수집 격자마다 district가 있고 값은 MOCK_CELLS 체계(구 이름)를 따른다", () => {
    for (const cell of MOCK_DEX.collectedCells) {
      expect(cell.district, `${cell.cellId}의 district`).toMatch(/구$/);
    }
  });
});
