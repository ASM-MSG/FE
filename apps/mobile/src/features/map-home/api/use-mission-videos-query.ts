import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getMissionVideosOptions } from "../../../shared/api/query-options";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { toFeedItemFromGlobal, type GridFeedItem } from "../model/grid-videos";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 미션 영상 피드 조회 (MSG-427 D10·D11) — `GET /api/missions/{missionId}/videos`.
 * 웹 `use-mission-videos-query.ts` 이식. 지도 SDK를 import하지 않는다.
 * 첫 페이지(기본 20건)만 쓴다 — 커서 무한 스크롤은 이번 범위 밖이다 (스펙 추정 8).
 */
export interface MissionVideosResult extends GatedQueryStatus {
  items: GridFeedItem[];
}

const EMPTY_ITEMS: GridFeedItem[] = [];

export const useMissionVideosQuery = (
  missionId: number | null,
): MissionVideosResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const active = isAuthenticated && missionId !== null;

  const query = useQuery({
    ...getMissionVideosOptions({ path: { missionId: missionId ?? 0 } }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  // 소유 구분이 없는 전역 목록이라 mine=false 고정 — 표본 피드와 같은 계약(grid-videos)
  const items = useMemo(
    () => query.data?.videos.map(toFeedItemFromGlobal) ?? EMPTY_ITEMS,
    [query.data],
  );

  return { items, ...gatedQueryStatus(query, active, hydrated) };
};
