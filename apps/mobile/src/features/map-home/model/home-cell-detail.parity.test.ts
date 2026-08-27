import { describe, expect, it } from "vitest";
import type { GridCellResponseDto } from "../../../shared/api/sdk";
import { canOpenDetail, deriveHomeCellDetail } from "./home-cell-detail";
import type { ThemeId } from "./themes";

/**
 * C2·C5: `canOpenDetail`이 상세 진입을 게이트하고(테마 활성 시 그 테마의 강조 격자만,
 * 비활성 시 내 점령 격자만), `deriveHomeCellDetail`이 배지 행(`내 점령`·테마)과 통계
 * 문구를 파생한다 (MSG-427) — 웹 원본 동등.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/home-cell-detail.ts",
  import.meta.url,
).pathname;

interface WebCellDetail {
  canOpenDetail: typeof canOpenDetail;
  /**
   * MSG-474: 웹은 뷰어 인증 여부 판별식 유니언(`viewerAuthenticated`)으로 시그니처가
   * 갈렸다 — 모바일 홈은 로그인 전용이라 자체 derive는 구 시그니처를 유지하고,
   * 패리티는 웹의 **인증 경로**(`viewerAuthenticated: true`)와 동등을 단정한다.
   * (비로그인 경로는 웹 전용 동작이라 모바일 대응물이 없다)
   */
  deriveHomeCellDetail: (
    input: Parameters<typeof deriveHomeCellDetail>[0] & {
      viewerAuthenticated: true;
    },
  ) => ReturnType<typeof deriveHomeCellDetail>;
}

const loadWeb = (): Promise<WebCellDetail> => import(WEB_PATH);

const CELLS: GridCellResponseDto[] = [
  {
    gridId: "16858_11420",
    occupied: true,
    videoCount: 3,
    zoneName: "서면",
    zoneCell: "A-14",
    regionName: "부전제1동",
  } as GridCellResponseDto,
  {
    gridId: "16882_11434",
    occupied: false,
    videoCount: 0,
    zoneName: null,
    zoneCell: null,
    regionName: null,
  } as GridCellResponseDto,
];
const THEMES: (ThemeId | null)[] = [null, "hot", "festival", "popup", "route"];
const REGION_NAMES: (string | null)[] = ["부전제1동", null];

describe("home-cell-detail 웹 원본 동등성 (C2·C5)", () => {
  it("테마 활성 시 그 테마의 강조 격자만, 비활성 시 내 점령 격자만 열린다", () => {
    expect(canOpenDetail(null, "a", ["a"], [])).toBe(false);
    expect(canOpenDetail(null, "a", [], ["a"])).toBe(true);
    expect(canOpenDetail("hot", "a", ["a"], [])).toBe(true);
    expect(canOpenDetail("hot", "a", [], ["a"])).toBe(false);
  });

  it("배지가 내 점령 → 활성 테마 순으로 붙고, 행정동이 없으면 위치 줄이 null이다", () => {
    const detail = deriveHomeCellDetail({
      cell: CELLS[0],
      regionName: "부전제1동",
      activeTheme: "hot",
    });

    expect(detail.badges).toEqual([
      { id: "occupied", label: "내 점령" },
      { id: "hot", label: "핫구역" },
    ]);
    expect(detail.label).toBe("서면 A-14");
    expect(detail.subtitle).toBe("내 영상 3개");
    expect(
      deriveHomeCellDetail({
        cell: CELLS[1],
        regionName: null,
        activeTheme: null,
      }).regionLabel,
    ).toBeNull();
  });

  it("표본 전건에서 웹 원본과 같은 게이트·표시 모델을 낸다", async () => {
    const web = await loadWeb();

    for (const cell of CELLS) {
      for (const activeTheme of THEMES) {
        for (const regionName of REGION_NAMES) {
          expect(
            deriveHomeCellDetail({ cell, regionName, activeTheme }),
          ).toEqual(
            web.deriveHomeCellDetail({
              viewerAuthenticated: true,
              cell,
              regionName,
              activeTheme,
            }),
          );
        }
        expect(
          canOpenDetail(
            activeTheme,
            cell.gridId,
            ["16858_11420"],
            ["16858_11420"],
          ),
        ).toBe(
          web.canOpenDetail(
            activeTheme,
            cell.gridId,
            ["16858_11420"],
            ["16858_11420"],
          ),
        );
      }
    }
  });
});
