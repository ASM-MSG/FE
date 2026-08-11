import { describe, expect, it } from "vitest";
import type {
  GridCellResponseDto,
  GridCoverVideoResponseDto,
} from "@/shared/api/generated";
import { canOpenDetail, deriveHomeCellDetail } from "./home-cell-detail";

const SEOMYEON_GRID_ID = "39064_112221";

const cell = (
  overrides: Partial<GridCellResponseDto> = {},
): GridCellResponseDto => ({
  gridId: SEOMYEON_GRID_ID,
  occupied: true,
  videoCount: 4,
  zoneName: "서면",
  zoneCell: "A-14",
  // 2026-08-11 명세 재생성으로 신설된 필수 필드 (행정동 폴백 라벨)
  regionName: "부산 부산진구 부전동",
  ...overrides,
});

const COVER: GridCoverVideoResponseDto = {
  videoId: 1042,
  thumbnailUrl: "https://cdn.example/thumb.jpg",
  durationSec: 27,
  viewCount: 1400,
  recordedAt: "2026-07-31T18:03:11",
};

describe("canOpenDetail — 셀 탭 상세 오픈 판정 (MSG-252 AC 9·10)", () => {
  it("테마 비활성이면 내 점령 격자만 상세를 연다", () => {
    expect(canOpenDetail(null, SEOMYEON_GRID_ID, [], [SEOMYEON_GRID_ID])).toBe(
      true,
    );
    expect(canOpenDetail(null, SEOMYEON_GRID_ID, [], [])).toBe(false);
  });

  it("테마 활성이면 그 테마의 강조 격자만 상세를 연다", () => {
    expect(canOpenDetail("hot", SEOMYEON_GRID_ID, [SEOMYEON_GRID_ID], [])).toBe(
      true,
    );
    expect(canOpenDetail("hot", SEOMYEON_GRID_ID, [], [SEOMYEON_GRID_ID])).toBe(
      false,
    );
  });
});

describe("deriveHomeCellDetail — API 3종 → 상세 표시 모델 (MSG-325 기준 8)", () => {
  it("제목은 구역 라벨이고, 내 점령이면 배지가 붙고, 서브타이틀은 내 영상 수다", () => {
    const detail = deriveHomeCellDetail({
      cell: cell(),
      cover: COVER,
      regionName: "부산광역시 부산진구 부전1동",
      activeTheme: null,
    });

    expect(detail.gridId).toBe(SEOMYEON_GRID_ID);
    expect(detail.label).toBe("서면 A-14");
    expect(detail.badges).toEqual([{ id: "occupied", label: "내 점령" }]);
    expect(detail.subtitle).toBe("내 영상 4개");
  });

  it("미점령 격자는 점령 배지가 없다 — 미점령도 404가 아니라 occupied=false로 온다", () => {
    const detail = deriveHomeCellDetail({
      cell: cell({ occupied: false, videoCount: 0 }),
      cover: null,
      regionName: null,
      activeTheme: null,
    });

    expect(detail.badges).toEqual([]);
    expect(detail.subtitle).toBe("내 영상 0개");
  });

  it("테마 활성 상세는 점령 배지 뒤에 테마 배지가 붙고 accent가 테마다", () => {
    const detail = deriveHomeCellDetail({
      cell: cell(),
      cover: COVER,
      regionName: null,
      activeTheme: "hot",
    });

    expect(detail.badges).toEqual([
      { id: "occupied", label: "내 점령" },
      { id: "hot", label: "핫구역" },
    ]);
    expect(detail.accent).toBe("hot");
  });

  it("대표 영상 후보가 없으면(cover null) coverVideo가 null이다 — 그 영역만 비표시", () => {
    const detail = deriveHomeCellDetail({
      cell: cell(),
      cover: null,
      regionName: "부산광역시 부산진구 부전1동",
      activeTheme: null,
    });

    expect(detail.coverVideo).toBeNull();
    expect(detail.regionLabel).toBe("부산광역시 부산진구 부전1동");
  });

  it("행정동이 없으면(by-grid null) regionLabel이 null이다 — cover 유무와 독립 분기", () => {
    const detail = deriveHomeCellDetail({
      cell: cell(),
      cover: COVER,
      regionName: null,
      activeTheme: null,
    });

    expect(detail.regionLabel).toBeNull();
    expect(detail.coverVideo).toBe(COVER);
  });

  it("구역 밖 격자는 제목이 행정동명으로 폴백한다 (기준 6 연결)", () => {
    const detail = deriveHomeCellDetail({
      cell: cell({ zoneName: null, zoneCell: null }),
      cover: null,
      regionName: "부산광역시 부산진구 부전1동",
      activeTheme: null,
    });

    expect(detail.label).toBe("부산광역시 부산진구 부전1동");
  });
});
