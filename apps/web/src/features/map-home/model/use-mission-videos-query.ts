import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { getMissionVideosOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { toFeedItemFromGlobal, type GridFeedItem } from "./grid-videos";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 미션 영상 피드 조회 (MSG-403 AC 22) — `GET /api/missions/{missionId}/videos`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * MSG-395는 미션 영역의 격자를 표본으로 뽑아 격자별 영상 API를 여러 번 부르고 합쳤다
 * (표본 상한 때문에 영역 일부만 보이는 근사였다). 미션 단위 API가 열려 그 조합을 걷어낸다.
 * 첫 페이지만 쓴다 — 커서 페이지네이션(무한 스크롤)은 이번 범위 밖이다(스펙 제외 범위).
 * 익명 게이트 없음 (MSG-462 AC 13) — 서버 MSG-454가 익명 조회를 허용해 해제했다.
 */
export interface MissionVideosResult {
  items: GridFeedItem[];
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

const EMPTY_ITEMS: GridFeedItem[] = [];

export const useMissionVideosQuery = (
  missionId: number | null,
): MissionVideosResult => {
  const active = missionId !== null;

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

  return {
    items,
    ...gatedQueryStatus(query, active),
  };
};
