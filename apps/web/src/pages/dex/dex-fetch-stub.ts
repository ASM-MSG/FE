import { vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";

/**
 * 도감 스모크 공용 fetch 스텁 (MSG-327) — 네트워크 경계 한 곳에서만 목한다(테스트 템플릿 공통 규칙).
 * 도감 화면은 실 API 5~7종을 동시에 태우므로 케이스마다 스텁을 다시 쓰면 분기가 흩어진다.
 * pathname으로 갈라 응답을 주고, `overrides`로 케이스별 페이로드·실패만 갈아끼운다.
 */

export const ME = {
  email: "me@example.com",
  nickname: "필맵퍼",
  profileImageUrl: null,
  createdAt: "2026-01-12T00:00:00Z",
  // 로그인 시딩 기본값 — false면 온보딩 동의 게이트 대상 (MSG-407 픽스처 보수)
  locationConsent: true,
};

export const SUMMARY = {
  totalGridCount: 6,
  totalVideoCount: 11,
  visitedRegionCount: 3,
  currentStreak: 12,
  maxStreak: 20,
  badgeCount: 4,
};

export const POINT_STAT = {
  regionCode: "2644056000",
  regionName: "부전제1동",
  parentCode: "26440",
  collectedCount: 6,
  totalCount: 120,
  progressRate: 52,
  updatedAt: "2026-08-14T00:00:00Z",
};

export const GRID_SEOMYEON = {
  gridId: "39064_112221",
  gridY: 39064,
  gridX: 112221,
  firstCollectedAt: "2026-08-12T09:00:00Z",
  lastUploadedAt: "2026-08-14T09:00:00Z",
  videoCount: 4,
  coverVideoId: 1,
  coverThumbnailUrl: null,
  regionName: "부전제1동",
  zoneName: "서면",
  zoneCell: "A-02",
};

export const GRID_JEONPO = {
  gridId: "39070_112230",
  gridY: 39070,
  gridX: 112230,
  firstCollectedAt: "2026-08-01T09:00:00Z",
  lastUploadedAt: "2026-08-02T09:00:00Z",
  videoCount: 1,
  coverVideoId: 2,
  coverThumbnailUrl: null,
  regionName: "전포동",
  zoneName: "전포",
  zoneCell: "A-15",
};

interface StubOverrides {
  grids?: unknown[];
  badges?: unknown[];
  videos?: unknown[];
  /** by-grid 응답 — 명세상 nullable이라 null(행정동 미판정)도 정상 응답이다 */
  gridStat?: unknown;
  /** 뱃지 응답을 영원히 보류 — 다른 응답은 도착한 뒤의 "뱃지만 로딩" 상태 재현용 */
  holdBadges?: boolean;
  /** 대표 뱃지 PUT을 영원히 보류 — 저장 pending 중 편집모드 UI 상태 재현용 (MSG-413) */
  holdFeaturedPut?: boolean;
  /** 실패시킬 경로 조각 — 해당 요청만 500을 돌려준다 */
  failPath?: string;
}

/** 도감 화면이 호출하는 엔드포인트 전부를 덮는 fetch 스텁을 설치한다 */
export const stubDexFetch = ({
  grids = [GRID_SEOMYEON, GRID_JEONPO],
  badges = [],
  videos = [],
  gridStat = POINT_STAT,
  holdBadges = false,
  holdFeaturedPut = false,
  failPath,
}: StubOverrides = {}) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (failPath !== undefined && pathname.includes(failPath)) {
        return new Response(null, { status: 500 });
      }
      switch (pathname) {
        case "/api/users/me":
          return envelopeResponse(ME);
        case "/api/collections/summary":
          return envelopeResponse(SUMMARY);
        case "/api/collections/grids":
          return envelopeResponse(grids);
        case "/api/badges":
          if (holdBadges) return new Promise<Response>(() => {});
          return envelopeResponse(badges);
        case "/api/badges/featured":
          if (holdFeaturedPut) return new Promise<Response>(() => {});
          return envelopeResponse([]);
        case "/api/regions/stats/by-point":
          return envelopeResponse(POINT_STAT);
        case "/api/regions/stats/by-grid":
          return envelopeResponse(gridStat);
        case "/api/collections/videos":
          return envelopeResponse(videos);
        default:
          return new Response(null, { status: 404 });
      }
    }),
  );
};
