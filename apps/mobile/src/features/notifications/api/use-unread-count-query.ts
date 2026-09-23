import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { getUnreadCountOptions } from "../../../shared/api/query-options";
import { useAppForeground } from "../../../shared/use-app-foreground";

/** 안읽은 알림 개수 캐시 봉투 — mutation의 낙관 기록이 같은 형태를 쓴다 */
export type UnreadCountEnvelope = { data: { count: number } };

/**
 * 안읽은 알림 개수 (MSG-602 S1·S2) — `GET /api/notifications/unread-count`.
 * 홈 아바타 빨간 점·프로필 "새 알림 N개"·알림함 요약 행이 같은 캐시를 본다.
 * 화면 복귀(다른 화면에서 읽음 처리 후)와 포그라운드 복귀(푸시가 온 뒤 돌아옴)에 다시 센다 —
 * 푸시 수신 이벤트로 갱신하지 않는 이유는 FCM payload에 data가 없어(MSG-432 선행) 앱이
 * "알림이 왔다"를 알 방법이 배너뿐이기 때문이다. 폴링은 두지 않는다(PRD 비목표).
 */
export const useUnreadCountQuery = () => {
  const query = useQuery({
    ...getUnreadCountOptions(),
    select: (envelope: UnreadCountEnvelope) => envelope.data.count,
    staleTime: 30_000,
  });
  const { refetch } = query;
  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);
  useFocusEffect(refresh);
  useAppForeground(refresh);
  return query;
};
