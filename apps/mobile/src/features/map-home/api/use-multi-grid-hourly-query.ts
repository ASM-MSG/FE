import { useQueries } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getGridHourlyUploadsOptions } from "../../../shared/api/query-options";
import type { ApiResponseDtoGridHourlyUploadResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import { deriveHourlyBars, type HourlyChart } from "../model/hourly-uploads";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 활발한 시간대 조회 (MSG-427 B9·B-11, 승인 Q3) —
 * `GET /api/grids/{gridId}/hourly-uploads`를 **핫스코어 상위 5격자**에 대해 부르고 합산한다.
 * 지도 SDK를 import하지 않는다.
 *
 * Figma·티켓이 그래프를 동 요약에 두는데 API는 격자 단위뿐이다 — 동 전체를 그리려면
 * 격자 수만큼 요청이 나가므로, 요약의 다른 수치와 **같은 표본**(상위 5격자)으로 근사한다.
 * 호출부가 격자 수를 상한으로 묶어 넘기므로 여기서는 받은 만큼만 조회한다.
 */
export interface MultiGridHourlyResult {
  chart: HourlyChart;
}

export const useMultiGridHourlyQuery = (
  gridIds: string[],
): MultiGridHourlyResult => {
  const { isAuthenticated } = useAuth();

  const queries = useQueries({
    queries: gridIds.map((gridId) => ({
      ...getGridHourlyUploadsOptions({ path: { gridId } }),
      select: (envelope: ApiResponseDtoGridHourlyUploadResponseDto) =>
        unwrapEnvelope(envelope),
      enabled: isAuthenticated,
      ...entityQueryPolicy,
    })),
  });

  // 격자별 응답을 이어붙여 넘긴다 — 같은 시각의 중복은 파생이 누적한다 (B-11).
  // useMemo를 쓰지 않는 이유는 use-multi-grid-videos-query와 같다(쿼리 수 가변)
  return {
    chart: deriveHourlyBars(
      queries.flatMap((query) => query.data?.hours ?? []),
    ),
  };
};
