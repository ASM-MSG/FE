import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { decodeGridCenter, type Bounds } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { getHotZonesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { mapQueryPolicy } from "./map-query-policy";
import type { ThemeCell } from "./theme";
import { viewportQueryArgs } from "./viewport-query";

/**
 * 뷰포트 내 핫구역 조회 (MSG-325 기준 14) — 핫스코어 내림차순, 없으면 빈 목록.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 반환은 테마 셀 형태다 — 핫구역만 API 소스로 전환하고 지역축제·팝업스토어·경로추천은
 * 목을 유지하므로(결정 3), 두 소스가 같은 오버레이 파이프라인(buildHomeOverlayCells)을 탄다.
 */
export const useHotZoneCells = (bounds: Bounds | null): ThemeCell[] => {
  // 보호 API(익명 401 실측 — MSG-328 사용자 버그 리포트): 비로그인은 조회하지 않는다.
  // 게이트 없이는 홈 (재)마운트마다 401 + auth-pipeline reissue가 재발사된다
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { query: viewport, enabled } = viewportQueryArgs(bounds);
  const { data } = useQuery({
    ...getHotZonesOptions({ query: viewport }),
    select: unwrapEnvelope,
    enabled: enabled && isAuthenticated,
    ...mapQueryPolicy,
  });

  // center는 5179 셀 중심의 역변환(MSG-357) — 다시 encodeGridId하면 원래 gridId로 돌아와
  // 오버레이 파이프라인(buildHomeOverlayCells)의 id 체계와 어긋나지 않는다.
  // useMemo: 매 렌더 새 배열이면 소비처 themeCells → buildHomeOverlayCells 메모가
  // 훅과 무관한 리렌더(사이드바 토글 등)마다 무효화된다 (리뷰 반영)
  return useMemo(
    () =>
      (data?.hotZones ?? []).map(({ gridId }) => ({
        id: gridId,
        center: decodeGridCenter(gridId),
      })),
    [data],
  );
};
