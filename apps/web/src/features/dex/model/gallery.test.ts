import { describe, expect, it } from "vitest";
import type { CollectedCell, CollectedVideo } from "@/entities/dex";
import {
  GALLERY_PREVIEW_LIMIT,
  deriveGalleryPreview,
  districtOfCell,
  resolveGalleryRegion,
  selectRegionVideos,
} from "./gallery";

const cell = (
  cellId: string,
  district: string,
  overrides: Partial<CollectedCell> = {},
): CollectedCell => ({
  cellId,
  label: `격자 ${cellId}`,
  district,
  center: { lat: 37.55, lng: 126.92 },
  collectedAt: "2026-07-01T09:00:00.000Z",
  videoCount: 1,
  ...overrides,
});

const video = (
  id: string,
  cellId: string,
  collectedAt: string,
): CollectedVideo => ({
  id,
  cellId,
  cellLabel: `격자 ${cellId}`,
  collectedAt,
});

const CELLS: CollectedCell[] = [
  cell("A-14", "마포구"),
  cell("B-08", "마포구"),
  cell("C-02", "성동구"),
];

describe("selectRegionVideos — 지역 갤러리 영상 선별 (AC 1)", () => {
  it("지정 지역 격자의 영상만 collectedAt 내림차순으로 반환하고, 다른 지역 영상은 포함하지 않는다", () => {
    const videos = [
      video("v1", "A-14", "2026-07-20T09:00:00.000Z"),
      video("v2", "C-02", "2026-07-22T09:00:00.000Z"), // 성동구 — 제외 대상
      video("v3", "B-08", "2026-07-21T09:00:00.000Z"),
    ];

    const result = selectRegionVideos(CELLS, videos, "마포구");

    expect(result.map((v) => v.id)).toEqual(["v3", "v1"]);
  });

  it("collectedAt 동률이면 id 오름차순으로 안정 정렬하고, 원본 배열은 변형하지 않는다", () => {
    const same = "2026-07-20T09:00:00.000Z";
    const videos = [
      video("v-b", "A-14", same),
      video("v-a", "B-08", same),
    ];

    const result = selectRegionVideos(CELLS, videos, "마포구");

    expect(result.map((v) => v.id)).toEqual(["v-a", "v-b"]);
    expect(videos.map((v) => v.id)).toEqual(["v-b", "v-a"]);
  });

  it("수집이 없는 지역은 빈 배열을 반환한다", () => {
    const videos = [video("v1", "A-14", "2026-07-20T09:00:00.000Z")];

    expect(selectRegionVideos(CELLS, videos, "중구")).toEqual([]);
  });
});

describe("deriveGalleryPreview — 프리뷰 9개 + hasMore 파생 (AC 2)", () => {
  const manyVideos = (n: number): CollectedVideo[] =>
    Array.from({ length: n }, (_, i) =>
      video(
        `v-${String(i).padStart(2, "0")}`,
        "A-14",
        new Date(Date.UTC(2026, 6, 1) + i * 60_000).toISOString(),
      ),
    );

  it("10개 이상 입력이면 앞(최신)에서 9개만 남기고 hasMore=true다", () => {
    const preview = deriveGalleryPreview(manyVideos(10));

    expect(preview.videos.length).toBe(GALLERY_PREVIEW_LIMIT);
    expect(preview.videos.map((v) => v.id)).toEqual(
      manyVideos(10)
        .slice(0, 9)
        .map((v) => v.id),
    );
    expect(preview.hasMore).toBe(true);
  });

  it("9개 이하 입력이면 전량 반환하고 hasMore=false다", () => {
    const exact = deriveGalleryPreview(manyVideos(9));
    expect(exact.videos.length).toBe(9);
    expect(exact.hasMore).toBe(false);

    const few = deriveGalleryPreview(manyVideos(4));
    expect(few.videos.length).toBe(4);
    expect(few.hasMore).toBe(false);

    const empty = deriveGalleryPreview([]);
    expect(empty.videos).toEqual([]);
    expect(empty.hasMore).toBe(false);
  });
});

describe("resolveGalleryRegion — 갤러리 표시 지역 결정 (AC 3)", () => {
  it("셀 클릭 선택 지역이 있으면 역지오코딩 결과보다 우선한다", () => {
    expect(resolveGalleryRegion("성동구", "마포구")).toBe("성동구");
  });

  it("선택이 없으면 역지오코딩 결과를 쓴다", () => {
    expect(resolveGalleryRegion(null, "마포구")).toBe("마포구");
  });

  it("선택도 역지오코딩 결과도 없으면 디폴트 '중구'다", () => {
    expect(resolveGalleryRegion(null, null)).toBe("중구");
  });
});

describe("districtOfCell — 격자 → 소속 지역 (AC 4)", () => {
  it("cellId로 수집 격자의 소속 지역을 반환한다", () => {
    expect(districtOfCell(CELLS, "C-02")).toBe("성동구");
  });

  it("수집 목록에 없는 id는 null을 반환한다 — 클릭 no-op 방어", () => {
    expect(districtOfCell(CELLS, "Z-99")).toBeNull();
  });
});
