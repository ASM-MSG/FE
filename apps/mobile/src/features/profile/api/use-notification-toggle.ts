import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { getPreferencesQueryKey } from "../../../shared/api/query-options";
// 생성 함수명이 `update`로 전역적으로 모호해 별칭을 강제한다 (스펙 R7)
import { update as updatePreference } from "../../../shared/api/sdk";
import {
  NOTIFICATION_CATEGORIES,
  applyMasterToggle,
  deriveMasterToggle,
  type PreferencesEnvelope,
} from "../model/notification-toggle";
import { usePreferencesQuery } from "./use-preferences-query";

/**
 * `알림 받기` 단일 토글 (기준 2·3·5·6) — `PATCH /api/notifications/preferences/{category}`를
 * 카테고리 5종에 일괄 발사한다. 서버에 마스터 스위치가 없어 FE가 합성하는 구조라
 * (스펙 Q1·R3) 표시·저장 규칙 전부가 model/notification-toggle의 순수 파생에 있다.
 *
 * - `onMutate`: 캐시에 낙관 반영 + 이전 봉투 스냅숏 — 응답 전에 스위치가 전환된다 (기준 3)
 * - `onSuccess`: 응답 봉투에 토글 값을 기록해 `setQueryData`로 직접 남긴다 —
 *   invalidate/refetch 금지 (기준 3, 웹 MSG-409 정책 미러)
 * - `onError`: 스냅숏 전체 복원 — 5건 중 하나만 실패해도 직전 상태로 되돌린다 (기준 5).
 *   서버에는 일부만 적용된 상태가 남을 수 있고, 다음 진입의 GET이 정본으로 수렴시킨다
 * - 연타 가드는 `mutationKey` in-flight 조회로 판정한다 (기준 6) — `isPending`은 React
 *   상태라 같은 tick의 재탭을 못 막는다(웹은 같은 이유로 ref를 썼다)
 */

/** in-flight 판정용 키 — 연타 가드가 이 키로 진행 중 뮤테이션을 센다 */
const NOTIFICATION_TOGGLE_MUTATION_KEY = [
  "notification-preferences",
  "master-toggle",
];

interface ToggleContext {
  previous: PreferencesEnvelope | undefined;
}

/**
 * 훅이 `useMutation`에 그대로 넘기는 옵션 — RN 렌더 테스트가 없어(vitest.config 정책)
 * 테스트는 이 객체를 `MutationObserver`로 구동한다.
 */
export const notificationToggleMutationOptions = (
  queryClient: QueryClient,
): UseMutationOptions<PreferencesEnvelope, Error, boolean, ToggleContext> => {
  const queryKey = getPreferencesQueryKey();
  return {
    mutationKey: NOTIFICATION_TOGGLE_MUTATION_KEY,
    mutationFn: async (enabled) => {
      const responses = await Promise.all(
        NOTIFICATION_CATEGORIES.map((category) =>
          updatePreference({
            path: { category },
            body: { enabled },
            throwOnError: true,
          }),
        ),
      );
      // 5건 모두 "변경 후 전체 상태"를 돌려준다 — 봉투 메타 보존용으로 마지막 응답을 쓴다
      return responses[responses.length - 1].data;
    },
    onMutate: (enabled) => {
      const previous = queryClient.getQueryData<PreferencesEnvelope>(queryKey);
      if (previous !== undefined) {
        queryClient.setQueryData<PreferencesEnvelope>(
          queryKey,
          applyMasterToggle(previous, enabled),
        );
      }
      return { previous };
    },
    onSuccess: (envelope, enabled) => {
      queryClient.setQueryData<PreferencesEnvelope>(
        queryKey,
        applyMasterToggle(envelope, enabled),
      );
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<PreferencesEnvelope>(
          queryKey,
          context.previous,
        );
      }
    },
  };
};

/** 저장이 왕복 중인가 — 연타 가드의 판정 (기준 6) */
export const isNotificationTogglePending = (
  queryClient: QueryClient,
): boolean =>
  queryClient.isMutating({ mutationKey: NOTIFICATION_TOGGLE_MUTATION_KEY }) > 0;

/**
 * 연타 가드가 걸린 토글 트리거를 만든다 (기준 6) — 진행 중이면 새 요청을 만들지 않는다.
 * 훅 밖으로 뺀 이유는 이 가드가 기준 6 그 자체라 테스트가 직접 구동해야 하기 때문이다.
 */
export const createNotificationToggle =
  (queryClient: QueryClient, mutate: (enabled: boolean) => void) =>
  (enabled: boolean): void => {
    if (isNotificationTogglePending(queryClient)) return;
    mutate(enabled);
  };

/** 화면이 쓰는 토글 상태·조작 — 조회(기준 4)와 저장(기준 2·3·5·6)을 한 곳으로 묶는다 */
export const useNotificationToggle = () => {
  const queryClient = useQueryClient();
  const { data: preferences } = usePreferencesQuery();
  const mutation = useMutation(notificationToggleMutationOptions(queryClient));

  return {
    // 조회 전·실패 시에도 화면이 잠기지 않게 opt-out 기본(전부 on)으로 보여 준다
    checked: preferences === undefined ? true : deriveMasterToggle(preferences),
    toggle: createNotificationToggle(queryClient, (enabled) =>
      mutation.mutate(enabled),
    ),
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
};
