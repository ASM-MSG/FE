import type { Page } from "@playwright/test";

/**
 * 점령 격자 API 스텁 (MSG-325).
 *
 * 지도 오버레이·클러스터의 소스가 목(`MOCK_DEX.collectedCells`)에서 실 API
 * (`GET /api/grids`)로 바뀌면서, 로그인하지 않는 e2e 환경에서는 응답이 비어
 * 클러스터가 렌더되지 않는다. 렌더 회귀(줌 게이트)를 계속 지키려면 데이터를
 * 브라우저 밖에서 고정해야 하므로 네트워크 레벨에서 스텁한다.
 *
 * 좌표는 서면 일대(기본 진입 중심) — 서버 격자 규칙(EPSG:5179 미터 좌표
 * `floor(x/100)`·`floor(y/100)`, MSG-357)으로 인코딩한 3×3 블록이라 한 클러스터
 * 윈도에 묶인다. 값은 proj4로 서면역(35.1579, 129.0594)에서 재계산한 정본 —
 * 구 위경도 스텝 id는 신 체계 디코드 시 부산 밖이 되어 경계 필터에 걸러진다.
 */
const SEOMYEON_GRID_IDS = [
  "16858_11420",
  "16858_11421",
  "16858_11422",
  "16859_11420",
  "16859_11421",
  "16859_11422",
  "16860_11420",
  "16860_11421",
  "16860_11422",
];

const gridOf = (gridId: string) => {
  const [gridY, gridX] = gridId.split("_").map(Number);
  return { gridId, gridY, gridX, zoneName: null, zoneCell: null };
};

/**
 * `/api/grids`는 서면 일대 점령 격자로, `/api/hotzones`는 빈 목록으로 응답시킨다.
 * 인증이 없어도 200이 오므로 오버레이 파이프라인이 그대로 동작한다.
 */
export const stubOccupiedGrids = async (page: Page): Promise<void> => {
  await page.route("**/api/grids?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        developCode: 0,
        message: "성공",
        data: { grids: SEOMYEON_GRID_IDS.map(gridOf), nextCursor: null },
      }),
    }),
  );
  await page.route("**/api/hotzones?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        developCode: 0,
        message: "성공",
        data: { hotZones: [] },
      }),
    }),
  );
};
