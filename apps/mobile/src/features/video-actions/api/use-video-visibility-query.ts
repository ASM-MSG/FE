import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { gatedQueryStatus } from "../../../shared/api/gated-query-status";
import { getPlaybackOptions } from "../../../shared/api/query-options";

/**
 * 시트가 열릴 때만 현재 공개 범위를 읽는 게이트 쿼리 (MSG-431 S2, 승인 Q1 (a)) —
 * `GET /api/videos/{videoId}`.
 *
 * **목록 응답에 `visibility`가 없어서 생긴 보강이다**(`RegionVideoResponseDto`·
 * `GridVideoResponseDto` 전수 확인). 웹 MSG-411도 같은 경로를 쓴다 — 플랫폼 간 동작을
 * 갈리지 않게 하는 쪽으로 승인됐고, 목록 응답에 `visibility` 추가는 지라 환류 대상이다.
 *
 * 부작용을 아는 채로 쓴다: 이 엔드포인트는 조회수를 올린다(`viewCount: 이번 조회 증가 전
 * 스냅샷`). 그래서 ①시트를 연 순간에만 조회하고(`enabled: open`) ②전환 성공 후에는
 * 무효화 대신 응답 값을 캐시에 seed해(seedPlaybackVisibility) 재조회를 만들지 않는다.
 * 비활성 쿼리는 TanStack에서 영원히 pending이라 `gatedQueryStatus`가 눌러준다.
 */
export const useVideoVisibilityQuery = (videoId: number, open: boolean) => {
  const query = useQuery({
    ...getPlaybackOptions({ path: { videoId } }),
    select: (envelope): string => unwrapEnvelope(envelope).visibility,
    enabled: open,
  });

  return {
    /** 서버 공개 범위 — 미도착·실패면 null (어느 행에도 ✓가 없다) */
    visibility: query.data ?? null,
    ...gatedQueryStatus(query, open),
  };
};
