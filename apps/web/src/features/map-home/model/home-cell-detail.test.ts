import { describe, expect, it } from "vitest";
import type { GridCellResponseDto } from "@/shared/api/generated";
import { canOpenDetail, deriveHomeCellDetail } from "./home-cell-detail";

// MSG-326(추정 1): 대표 영상 단독 섹션이 영상 목록 피드로 대체되면서 coverVideo 필드·
// cover 입력이 제거됐다 — COVER 픽스처와 coverVideo 단정만 걷어냈고 나머지 단정은 불변.

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
  regionName: null,
  ...overrides,
});

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

describe("deriveHomeCellDetail — API 응답 → 상세 표시 모델 (MSG-325 기준 8)", () => {
  it("제목은 구역 라벨이고, 내 점령이면 배지가 붙고, 서브타이틀은 내 영상 수다", () => {
    const detail = deriveHomeCellDetail({
      viewerAuthenticated: true,
      cell: cell(),
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
      viewerAuthenticated: true,
      cell: cell({ occupied: false, videoCount: 0 }),
      regionName: null,
      activeTheme: null,
    });

    expect(detail.badges).toEqual([]);
    expect(detail.subtitle).toBe("내 영상 0개");
  });

  it("테마 활성 상세는 점령 배지 뒤에 테마 배지가 붙고 accent가 테마다", () => {
    const detail = deriveHomeCellDetail({
      viewerAuthenticated: true,
      cell: cell(),
      regionName: null,
      activeTheme: "hot",
    });

    expect(detail.badges).toEqual([
      { id: "occupied", label: "내 점령" },
      { id: "hot", label: "핫구역" },
    ]);
    expect(detail.accent).toBe("hot");
  });

  it("행정동이 있으면 regionLabel에 실리고, 없으면(by-grid null) null이다", () => {
    expect(
      deriveHomeCellDetail({
        viewerAuthenticated: true,
        cell: cell(),
        regionName: "부산광역시 부산진구 부전1동",
        activeTheme: null,
      }).regionLabel,
    ).toBe("부산광역시 부산진구 부전1동");

    expect(
      deriveHomeCellDetail({
        viewerAuthenticated: true,
        cell: cell(),
        regionName: null,
        activeTheme: null,
      }).regionLabel,
    ).toBeNull();
  });

  it("구역 밖 격자는 제목이 행정동명으로 폴백한다 (기준 6 연결)", () => {
    const detail = deriveHomeCellDetail({
      viewerAuthenticated: true,
      cell: cell({ zoneName: null, zoneCell: null }),
      regionName: "부산광역시 부산진구 부전1동",
      activeTheme: null,
    });

    expect(detail.label).toBe("부산광역시 부산진구 부전1동");
  });
});

describe("deriveHomeCellDetail — 비로그인 진입점 재료 조립 (MSG-474 AC 4)", () => {
  /** 진입점(핫구역·동 카드) 응답이 싣고 있는 이름 재료 — grids/{id} 미발사 전제 */
  const naming = {
    gridId: SEOMYEON_GRID_ID,
    zoneName: "서면",
    zoneCell: "A-14",
    regionName: "부산광역시 부산진구 부전1동",
  };

  it("비로그인이면 서브타이틀(내 영상 N개)이 만들어지지 않고(null) 내 점령 배지도 없다", () => {
    const detail = deriveHomeCellDetail({
      viewerAuthenticated: false,
      entryNaming: naming,
      regionName: naming.regionName,
      activeTheme: "hot",
    });

    expect(detail.subtitle).toBeNull();
    expect(detail.badges).toEqual([{ id: "hot", label: "핫구역" }]);
  });

  it("진입점 이름 재료만으로 제목·행정동 줄이 성립한다 — grids/{id} 응답 없이", () => {
    const detail = deriveHomeCellDetail({
      viewerAuthenticated: false,
      entryNaming: naming,
      regionName: naming.regionName,
      activeTheme: null,
    });

    expect(detail.gridId).toBe(SEOMYEON_GRID_ID);
    expect(detail.label).toBe("서면 A-14");
    expect(detail.regionLabel).toBe("부산광역시 부산진구 부전1동");
    expect(detail.accent).toBe("primary");
  });

  it("이름 재료가 비면(코스 스팟 — 좌표뿐) gridId로 폴백한다", () => {
    const detail = deriveHomeCellDetail({
      viewerAuthenticated: false,
      entryNaming: {
        gridId: SEOMYEON_GRID_ID,
        zoneName: null,
        zoneCell: null,
        regionName: null,
      },
      regionName: null,
      activeTheme: "route",
    });

    expect(detail.label).toBe(SEOMYEON_GRID_ID);
    expect(detail.regionLabel).toBeNull();
  });
});
