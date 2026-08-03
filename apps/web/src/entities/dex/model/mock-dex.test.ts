import { describe, expect, it } from "vitest";
import { MOCK_CELLS } from "@/entities/cell";
import {
  MOCK_BADGES,
  MOCK_COLLECTED_VIDEOS,
  MOCK_DEX,
  svgThumbnail,
} from "./mock-dex";

/**
 * mock 정합성 (AC 6, A6·A7·A9) — 갤러리 mock이 도감 mock과 모순되지 않음을 고정한다.
 * 값 자체가 아니라 불변식을 단정한다 — mock 수치 조정 시 이 규칙만 지키면 된다.
 */
describe("갤러리 mock 정합성 (AC 6)", () => {
  it("격자별 갤러리 영상 수가 CollectedCell.videoCount와 일치한다", () => {
    for (const cell of MOCK_DEX.collectedCells) {
      const count = MOCK_COLLECTED_VIDEOS.filter(
        (v) => v.gridId === cell.gridId,
      ).length;
      expect(count, `${cell.gridId} 영상 수`).toBe(cell.videoCount);
    }
  });

  it("모든 영상의 gridId가 수집 격자 목록에 존재한다", () => {
    const collectedIds = new Set(MOCK_DEX.collectedCells.map((c) => c.gridId));
    for (const video of MOCK_COLLECTED_VIDEOS) {
      expect(collectedIds.has(video.gridId), `${video.videoId}의 gridId`).toBe(
        true,
      );
    }
  });

  it("격자별 min(영상 createdAt)이 격자 firstCollectedAt과 같다 — 첫 영상 수집 = 격자 수집 (A9)", () => {
    for (const cell of MOCK_DEX.collectedCells) {
      const times = MOCK_COLLECTED_VIDEOS.filter(
        (v) => v.gridId === cell.gridId,
      ).map((v) => v.createdAt);
      const oldest = [...times].sort()[0];
      expect(oldest, `${cell.gridId} 최고령 영상 시각`).toBe(
        cell.firstCollectedAt,
      );
    }
  });

  it("부산진구 영상 합계가 9를 넘는다 — 프리뷰 제한·전체 보기 시연 가능 (A6)", () => {
    const busanjinCellIds = new Set(
      MOCK_DEX.collectedCells
        .filter((c) => c.district === "부산진구")
        .map((c) => c.gridId),
    );
    const busanjinCount = MOCK_COLLECTED_VIDEOS.filter((v) =>
      busanjinCellIds.has(v.gridId),
    ).length;
    expect(busanjinCount).toBeGreaterThan(9);
  });

  it("모든 수집 영상 videoId가 소속 격자 Cell.videos의 videoId로 존재한다 — 상세 시트 활성 매칭 정합 (② B3, AC 6 추가)", () => {
    for (const video of MOCK_COLLECTED_VIDEOS) {
      const cell = MOCK_CELLS.find((c) => c.id === video.gridId);
      expect(
        cell?.videos.some((v) => v.videoId === video.videoId),
        `${video.videoId}가 ${video.gridId}의 Cell.videos에 존재`,
      ).toBe(true);
    }
  });

  it("썸네일 제공 항목과 미제공 항목이 모두 존재한다 — placeholder 경로 검증 가능 (A7)", () => {
    expect(
      MOCK_COLLECTED_VIDEOS.some((v) => v.thumbnailUrl !== undefined),
    ).toBe(true);
    expect(
      MOCK_COLLECTED_VIDEOS.some((v) => v.thumbnailUrl === undefined),
    ).toBe(true);
  });

  it("수집 격자마다 district가 있고 값은 MOCK_CELLS 체계(구 이름)를 따른다", () => {
    for (const cell of MOCK_DEX.collectedCells) {
      expect(cell.district, `${cell.gridId}의 district`).toMatch(/구$/);
    }
  });

  it("뱃지 카탈로그의 earned 수가 통계 카드 표시값 badgeCount와 일치한다 (MSG-123 AC 5)", () => {
    const earnedCount = MOCK_BADGES.filter((b) => b.earned).length;

    expect(earnedCount).toBe(MOCK_DEX.summary.badgeCount);
    expect(earnedCount).toBeGreaterThan(0); // 획득 0이면 컬러/회색 구분(AC 4)이 시연 불가
  });

  it("뱃지 카탈로그가 프리뷰 8개보다 많다 — '전체 보기' 확장이 시연 가능하다 (MSG-123 A6)", () => {
    // 8은 features/dex/model/badges의 BADGE_PREVIEW_LIMIT — 부산진구 영상 합계 케이스(9) 선례로 값 고정
    expect(MOCK_BADGES.length).toBeGreaterThan(8);
  });

  it("획득 뱃지 전부가 프리뷰 앞 8개 안에 배치된다 — 프리뷰만 봐도 통계 카드와 정합한다 (MSG-123 AC 5, A2)", () => {
    MOCK_BADGES.forEach((badge, i) => {
      if (badge.earned) {
        expect(i, `획득 뱃지 ${badge.name}의 위치`).toBeLessThan(8);
      }
    });
  });

  it("뱃지 이름에 서울 지명이 없다 — MVP 부산 서면 규칙, Figma '서울 정복'은 '부산 정복' 치환 (MSG-123 AC 12)", () => {
    const seoulNames = /서울|마포|강남|홍대|성수|이태원|종로|여의도/;
    for (const badge of MOCK_BADGES) {
      expect(badge.name, `뱃지 이름 ${badge.name}`).not.toMatch(seoulNames);
    }
    expect(MOCK_BADGES.some((b) => b.name === "부산 정복")).toBe(true);
  });

  it("MOCK_DEX.badges가 카탈로그 정본(MOCK_BADGES)이다 — 뱃지 탭이 도감 조회 게이트를 공유한다 (MSG-123 AC 11)", () => {
    expect(MOCK_DEX.badges).toBe(MOCK_BADGES);
  });

  it("XML 특수문자(&·<·>)가 포함된 라벨도 이스케이프되어 유효한 SVG data URI를 생성한다 (④ AC 28)", () => {
    const uri = svgThumbnail("서면 <A&B> 상가", 1);
    const prefix = "data:image/svg+xml;utf8,";
    expect(uri.startsWith(prefix)).toBe(true);

    const markup = decodeURIComponent(uri.slice(prefix.length));
    // 원시 특수문자가 아니라 XML 엔티티로 삽입된다 (&가 &amp;로 — 이중 이스케이프 아님)
    expect(markup).toContain("서면 &lt;A&amp;B&gt; 상가");

    // 유효 XML — 파싱 에러 없이 원래 라벨이 텍스트 노드로 복원된다
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("text")?.textContent).toBe("서면 <A&B> 상가");
  });
});
