import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { getViewerCountOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 시청 인원 폴링 주기 (확정 1) — 서버 집계 창 90초·heartbeat 주기 30초와 정합.
 * 더 짧은 주기는 정밀도 이득 없이 부하만 늘린다 (스펙 상단 확정 근거).
 */
export const VIEWER_COUNT_REFETCH_MS = 30_000;

/**
 * 실시간 시청 인원 조회 (MSG-517 AC 3·4) —
 * `GET /api/event-occurrences/{occurrenceId}/viewer-count` 30초 refetchInterval 폴링.
 * 행사방(개요)이 열려 있을 때만 발사한다. 인증 없이 호출 가능(서버 명세).
 *
 * 실패 무해화 (AC 4): retry 없이 null로 수렴해 표시만 생략하고, refetchInterval은
 * 에러 상태에서도 계속 돌아 다음 주기에 자연 재시도된다. viewerCount null(캐시 장애)도
 * 같은 표시 생략으로 수렴한다 — 0은 값이다("0명 보는 중", AC 3).
 */
export const useViewerCountQuery = (
  occurrenceId: number | null,
): { viewerCount: number | null } => {
  const query = useQuery({
    // 미요청 상태에서도 생성 옵션 타입이 값을 요구해 0으로 채운다 (viewportQueryArgs 관례)
    ...getViewerCountOptions({ path: { occurrenceId: occurrenceId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: occurrenceId !== null,
    refetchInterval: VIEWER_COUNT_REFETCH_MS,
    retry: false,
  });

  return { viewerCount: query.data?.viewerCount ?? null };
};
