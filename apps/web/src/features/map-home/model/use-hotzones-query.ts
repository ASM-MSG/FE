import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { decodeGridCenter, type Bounds } from "@/entities/cell";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import type { HotZoneResponseDto } from "@/shared/api/generated";
import { getHotZonesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { mapQueryPolicy } from "./map-query-policy";
import type { ThemeCell } from "./theme";
import { viewportQueryArgs } from "./viewport-query";

const EMPTY_HOT_ZONES: HotZoneResponseDto[] = [];

/**
 * 뷰포트 내 핫구역 원본 조회 (MSG-395) — 핫스코어·행정동명이 필요한 소비처용.
 * `useHotZoneCells`가 버리는 `score`·`regionName`을 그대로 남긴다: 동 요약(AC 8~10)이
 * 행정동으로 걸러내고 스코어 상위 격자만 표본으로 삼기 때문이다.
 *
 * 조회 **상태까지** 돌려준다 (codex 리뷰 반영): 배열만 주면 핫구역 요청이 실패해도
 * 소비처는 "핫구역이 없는 동"과 구분하지 못해, 동 요약이 오류 대신 빈 상태를 띄운다.
 */
export interface HotZonesResult {
  zones: HotZoneResponseDto[];
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

export const useHotZones = (bounds: Bounds | null): HotZonesResult => {
  // 인증 게이트 없음 — MSG-454로 익명 조회 허용 (MSG-463에서 해제, 종전엔 익명 401 실측)
  const { query: viewport, enabled } = viewportQueryArgs(bounds);
  const query = useQuery({
    ...getHotZonesOptions({ query: viewport }),
    select: unwrapEnvelope,
    enabled,
    ...mapQueryPolicy,
  });

  return {
    zones: query.data?.hotZones ?? EMPTY_HOT_ZONES,
    // 비활성 쿼리는 영원히 pending이라 게이트로 눌러준다 (region 훅 관례)
    ...gatedQueryStatus(query, enabled),
  };
};

/**
 * 뷰포트 내 핫구역 조회 (MSG-325 기준 14) — 핫스코어 내림차순, 없으면 빈 목록.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 반환은 테마 셀 형태다 — 핫구역만 API 소스로 전환하고 지역축제·팝업스토어·경로추천은
 * 목을 유지하므로(결정 3), 두 소스가 같은 오버레이 파이프라인(buildHomeOverlayCells)을 탄다.
 */
export const useHotZoneCells = (bounds: Bounds | null): ThemeCell[] => {
  // 인증 게이트 없음 — MSG-454로 익명 조회 허용 (MSG-463에서 해제, 종전엔 익명 401 실측)
  const { query: viewport, enabled } = viewportQueryArgs(bounds);
  const { data } = useQuery({
    ...getHotZonesOptions({ query: viewport }),
    select: unwrapEnvelope,
    enabled,
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
