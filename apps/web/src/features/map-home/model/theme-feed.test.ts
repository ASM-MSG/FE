import { describe, expect, it } from "vitest";
import { MOCK_CELLS, type Cell, type CellVideo } from "@/entities/cell";
import { deriveThemeFeed } from "./theme-feed";

// ── 고정 픽스처 — mock 영상의 uploadedAt은 로드 시점 상대값이라 비결정적, 정렬·mine 단정은 픽스처로 ──

const fixtureVideo = (id: string, uploadedAt: string): CellVideo => ({
  id,
  title: "표본 영상",
  viewCount: 100,
  uploadedAt,
  durationSec: 60,
  uploaderHandle: "@busan.vlog",
});

const fixtureCell = (id: string, label: string, videos: CellVideo[]): Cell => ({
  id,
  label,
  district: "부산진구",
  center: { lat: 35.1573, lng: 129.0586 },
  videoCount: videos.length,
  createdAt: "2026-07-01T00:00:00.000Z",
  location: "부산 부산진구 서면",
  recentUploadedAt: "2026-07-30T00:00:00.000Z",
  fillRate: 50,
  viewCount: 100,
  videos,
});

/** 핫구역 테마 셀(A-14·A-15·B-07·G-04)과 id를 맞춘 픽스처 풀 — themeCellsOf가 목 테마 목록에 고정돼 있어 실제 id를 쓴다 */
const hotPool = (videosByCell: Record<string, CellVideo[]>): Cell[] =>
  ["A-14", "A-15", "B-07", "G-04"].map((id) =>
    fixtureCell(id, `서면 ${id}`, videosByCell[id] ?? []),
  );

describe("deriveThemeFeed — 테마 피드 파생 (AC 3·4)", () => {
  it("활성 테마의 강조 셀(themeCellsOf) 순서대로 셀 섹션을 만들고 라벨은 격자 데이터에서 온다 (AC 3)", () => {
    const feed = deriveThemeFeed("hot", MOCK_CELLS, []);

    expect(feed.sections.map((s) => s.cellId)).toEqual([
      "A-14",
      "A-15",
      "B-07",
      "G-04",
    ]);
    expect(feed.sections.map((s) => s.label)).toEqual([
      "서면 A-14",
      "전포 A-15",
      "부전 B-07",
      "범일 G-04",
    ]);
  });

  it("각 섹션 영상은 해당 셀 videos를 업로드 최신순으로 나열한다 (AC 3)", () => {
    // 최신(7/29)을 목록 중간에 둔다 — 원본 순서를 그대로 두는 구현을 걸러낸다
    const pool = hotPool({
      "A-14": [
        fixtureVideo("A-14-v1", "2026-07-25T12:00:00.000Z"),
        fixtureVideo("A-14-v2", "2026-07-29T12:00:00.000Z"),
        fixtureVideo("A-14-v3", "2026-07-27T12:00:00.000Z"),
      ],
    });

    const feed = deriveThemeFeed("hot", pool, []);

    expect(feed.sections[0].videos.map((v) => v.id)).toEqual([
      "A-14-v2",
      "A-14-v3",
      "A-14-v1",
    ]);
  });

  it("수집 영상 id(myVideoIds)와 매칭되는 영상만 mine으로 표시된다 (AC 4)", () => {
    const pool = hotPool({
      "A-14": [
        fixtureVideo("A-14-v1", "2026-07-29T12:00:00.000Z"),
        fixtureVideo("A-14-v2", "2026-07-28T12:00:00.000Z"),
      ],
    });

    const feed = deriveThemeFeed("hot", pool, ["A-14-v2"]);

    expect(
      feed.sections[0].videos.map((v) => ({ id: v.id, mine: v.mine })),
    ).toEqual([
      { id: "A-14-v1", mine: false },
      { id: "A-14-v2", mine: true },
    ]);
  });

  it("totalCount는 섹션 영상 수 합과 일치한다 — 셀 videoCount 필드가 아니라 실제 나열 표본 수 (AC 2·3, 추정 7)", () => {
    const pool = hotPool({
      "A-14": [
        fixtureVideo("A-14-v1", "2026-07-29T12:00:00.000Z"),
        fixtureVideo("A-14-v2", "2026-07-28T12:00:00.000Z"),
      ],
      "B-07": [fixtureVideo("B-07-v1", "2026-07-27T12:00:00.000Z")],
    });

    const feed = deriveThemeFeed("hot", pool, []);

    expect(feed.totalCount).toBe(3);
  });

  it("경로추천도 경로 주변 셀로 같은 구조의 피드를 만든다 (AC 1 — 4칩 동일 UX)", () => {
    const feed = deriveThemeFeed("route", MOCK_CELLS, []);

    expect(feed.sections.map((s) => s.cellId)).toEqual([
      "A-14",
      "A-15",
      "B-07",
    ]);
    expect(feed.totalCount).toBe(
      feed.sections.reduce((sum, s) => sum + s.videos.length, 0),
    );
  });
});
