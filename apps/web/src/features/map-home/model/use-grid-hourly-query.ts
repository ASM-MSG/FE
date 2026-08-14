import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGridHourlyUploadsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { deriveHourlyBars, type HourlyChart } from "./hourly-uploads";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 격자 시간대 업로드 조회 (MSG-395 AC 12) — `GET /api/grids/{gridId}/hourly-uploads`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * **격자 상세에서만** 발사한다 — 동 요약에서 부르면 동에 속한 격자 수만큼 요청이 나간다
 * (그래프를 격자 상세로 옮긴 근거, 사용자 확정).
 */
export interface GridHourlyResult {
  chart: HourlyChart;
}

const EMPTY_CHART = deriveHourlyBars([]);

export const useGridHourlyQuery = (gridId: string | null): GridHourlyResult => {
  const { data } = useQuery({
    ...getGridHourlyUploadsOptions({ path: { gridId: gridId ?? "" } }),
    select: unwrapEnvelope,
    enabled: gridId !== null,
    ...entityQueryPolicy,
  });

  return useMemo(
    () => ({ chart: data ? deriveHourlyBars(data.hours) : EMPTY_CHART }),
    [data],
  );
};
