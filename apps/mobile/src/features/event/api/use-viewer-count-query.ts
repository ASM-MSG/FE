import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getViewerCountOptions } from "../../../shared/api/query-options";

/** 폴링 주기 (D9) — 서버 집계 창 90초·heartbeat 30초와 정합. 더 짧으면 부하만 는다 */
export const VIEWER_COUNT_REFETCH_MS = 30_000;

/**
 * 실시간 시청 인원 조회 (MSG-560 D9) —
 * `GET /api/event-occurrences/{occurrenceId}/viewer-count` 30초 폴링.
 * **개요가 보이는 동안만** 발사한다(위치 상세는 인원을 그리지 않는다). 인증 불필요.
 *
 * 실패 무해화: `retry:false`로 null에 수렴해 표시만 생략하고, refetchInterval은 에러
 * 상태에서도 계속 돌아 다음 주기에 자연 재시도된다. viewerCount null(캐시 장애)도 같은
 * 표시 생략으로 수렴한다 — 0은 값이다("0명 보는 중").
 */
export const useViewerCountQuery = (
  occurrenceId: number | null,
  enabled: boolean,
): { viewerCount: number | null } => {
  const query = useQuery({
    // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
    ...getViewerCountOptions({ path: { occurrenceId: occurrenceId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: occurrenceId !== null && enabled,
    refetchInterval: VIEWER_COUNT_REFETCH_MS,
    retry: false,
  });

  return { viewerCount: query.data?.viewerCount ?? null };
};
