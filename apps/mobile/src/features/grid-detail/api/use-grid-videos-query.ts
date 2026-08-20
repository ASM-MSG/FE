import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { gatedQueryStatus } from "../../../shared/api/gated-query-status";
import {
  getGridGlobalVideosOptions,
  getGridVideosOptions,
} from "../../../shared/api/query-options";
import {
  buildGridVideoRows,
  combineGridVideoStatus,
  type GridVideoRow,
} from "../model/grid-videos";

/** 첫 페이지 크기 — 격자 상세는 대표 목록이라 더 보기(커서)를 두지 않는다 */
const PAGE_SIZE = 20;

export interface GridVideosResult {
  /** 병합된 행 목록 — 미도착이면 undefined */
  rows: GridVideoRow[] | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * "이 격자의 영상" 실 API 조회 (MSG-431 신고 배선 결정 1) — 2개 목록을 함께 읽는다.
 *
 * - `GET /api/grids/{gridId}/videos` — 본인·타인 포함 **공개·READY** 영상 (+ nickname)
 * - `GET /api/grids/{gridId}/my-videos` — 그 격자의 **내 영상** (비공개·처리 중 포함)
 *
 * 두 목록의 videoId 교집합이 소유 판정(`mine`)이며, 이것이 모바일에서 실 videoId를 가진
 * 타인 영상에 닿는 **유일한 경로**다(도감 갤러리는 정의상 전부 내 영상이다).
 * 두 쿼리를 합쳐 상태를 본다 — 소유 판정 없이 목록을 보여주면 내 영상에 "신고하기"가
 * 뜨는 오동작이 생기므로, 한쪽 실패도 목록 실패로 다룬다(갤러리 2단 조회 관례와 동일).
 *
 * 재시도는 실패한 쪽만이 아니라 **두 쿼리를 함께** 부른다 — 근거는 `combineGridVideoStatus`.
 *
 * 커서 페이지네이션은 쓰지 않는다 — 상세 시트는 대표 목록이고 첫 페이지 20건이면 충분하다
 * (더 보기 도입은 이 화면의 실연동을 마무리하는 후속 티켓 몫).
 */
export const useGridVideosQuery = (gridId: string | null): GridVideosResult => {
  const enabled = gridId !== null;
  const path = { path: { gridId: gridId ?? "" } };

  const global = useQuery({
    ...getGridGlobalVideosOptions({ ...path, query: { size: PAGE_SIZE } }),
    select: (envelope) => unwrapEnvelope(envelope).videos,
    enabled,
  });
  const mine = useQuery({
    ...getGridVideosOptions(path),
    select: unwrapEnvelope,
    enabled,
  });

  // 상태 합성(실패 전파 + 양쪽 재시도)은 순수 파생이라 모델에 있다 — 테스트가 고정한다
  const status = combineGridVideoStatus(
    gatedQueryStatus(global, enabled),
    gatedQueryStatus(mine, enabled),
  );

  return {
    // 두 응답이 **모두** 도착한 뒤에만 행을 만든다 — 내 영상 목록 없이 만들면 모든 행이
    // `mine: false`가 되어 내 영상에 "신고하기"가 뜬다. 그전까지 화면은 스피너다
    // (`isPending`이 참). `buildGridVideoRows`가 부분 데이터를 받지 않는 것도 같은 이유다
    rows:
      global.data && mine.data
        ? buildGridVideoRows(global.data, mine.data)
        : undefined,
    ...status,
  };
};
