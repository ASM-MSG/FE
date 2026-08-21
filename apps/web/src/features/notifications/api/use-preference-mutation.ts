import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
// 생성 queryKey는 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getPreferencesQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { update } from "@/shared/api/generated/sdk.gen";
import {
  applyPreference,
  readPreference,
  recordServerPreferences,
  type PreferencesEnvelope,
} from "../model/preference-cache";
import type { NotificationCategory } from "../model/preference-catalog";
import { usePushNoticeStore } from "../model/push-notice-store";

interface ToggleVariables {
  category: NotificationCategory;
  enabled: boolean;
}

/**
 * 카테고리 수신 토글 mutation 훅 (MSG-409 AC 6·7·8) — `PATCH
 * /api/notifications/preferences/{category}` (생성 SDK `update` 직접 호출, 멱등).
 * - onMutate: 캐시에 낙관 반영 + 이전 값 스냅숏 — UI는 즉시 전환된다 (AC 6)
 * - onSuccess: 응답(변경 후 전체 상태)을 getPreferences 캐시에 setQueryData로 직접
 *   기록한다 — invalidate/refetch 금지 (티켓 명시). 아직 왕복 중인 다른 카테고리의
 *   낙관 값은 보존한다 (스펙 리스크 — 먼저 온 응답이 나중 조작을 덮는 경합 차단)
 * - onError: 해당 카테고리만 이전 값으로 롤백 + push-notice-store 오류 안내 —
 *   신규 토스트 인프라 금지, 표시·닫기는 PushNoticeHost 몫 (추정 6, PR #60 리뷰 3 계승)
 * - 카테고리별 in-flight 추적 → 행 단위 busy 노출 + 연타 중첩 발사 차단 (AC 8).
 *   useMutation 상태는 마지막 mutate만 반영하므로 자체 Set으로 추적한다
 */
export const usePreferenceMutation = () => {
  const queryClient = useQueryClient();
  const showNotice = usePushNoticeStore((s) => s.showToggleNotice);
  // in-flight 정본은 ref(콜백 클로저에서 최신 판독), 렌더 반영용 복사본은 state
  const inFlightRef = useRef<Set<NotificationCategory>>(new Set());
  const [busyCategories, setBusyCategories] = useState<
    ReadonlySet<NotificationCategory>
  >(new Set());
  const syncBusy = () => setBusyCategories(new Set(inFlightRef.current));
  const queryKey = getPreferencesQueryKey();

  const mutation = useMutation({
    mutationFn: async ({ category, enabled }: ToggleVariables) => {
      const { data } = await update({
        path: { category },
        body: { enabled },
        throwOnError: true,
      });
      return data;
    },
    onMutate: ({ category, enabled }) => {
      inFlightRef.current.add(category);
      syncBusy();
      const current = queryClient.getQueryData<PreferencesEnvelope>(queryKey);
      if (current === undefined) return { previousEnabled: null };
      queryClient.setQueryData(
        queryKey,
        applyPreference(current, category, enabled),
      );
      return { previousEnabled: readPreference(current, category) };
    },
    onSuccess: (response, { category }) => {
      // 자신은 방금 확정됐으니 보존 대상에서 제외 — 나머지 in-flight만 낙관 값 유지
      const othersInFlight = [...inFlightRef.current].filter(
        (inFlight) => inFlight !== category,
      );
      queryClient.setQueryData<PreferencesEnvelope>(queryKey, (current) =>
        recordServerPreferences(current, response, othersInFlight),
      );
    },
    onError: (_error, { category }, context) => {
      if (context !== undefined && context.previousEnabled !== null) {
        const previous = context.previousEnabled;
        queryClient.setQueryData<PreferencesEnvelope>(queryKey, (current) =>
          current === undefined
            ? current
            : applyPreference(current, category, previous),
        );
      }
      showNotice("error");
    },
    onSettled: (_data, _error, { category }) => {
      inFlightRef.current.delete(category);
      syncBusy();
    },
  });

  const toggle = (category: NotificationCategory, enabled: boolean): void => {
    // 행 단위 연타 가드 — Switch busy 비활성의 이중 안전망 (AC 8)
    if (inFlightRef.current.has(category)) return;
    mutation.mutate({ category, enabled });
  };

  const isBusy = (category: NotificationCategory): boolean =>
    busyCategories.has(category);

  return { toggle, isBusy };
};
