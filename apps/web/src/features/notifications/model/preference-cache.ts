import type { ApiResponseDtoNotificationPreferenceResponseDto } from "@/shared/api/generated/types.gen";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "./preference-catalog";

/** getPreferences 캐시 원본 형태 — 봉투 그대로 (use-profile-query 선례) */
export type PreferencesEnvelope =
  ApiResponseDtoNotificationPreferenceResponseDto;

/** 봉투에서 카테고리 하나의 값을 판독한다 — 행 부재면 true (opt-out, AC 5) */
export const readPreference = (
  envelope: PreferencesEnvelope,
  category: NotificationCategory,
): boolean =>
  envelope.data.preferences.find((row) => row.category === category)?.enabled ??
  true;

/** 카테고리 하나의 낙관 값을 기록한 새 봉투를 만든다 (AC 6 — 원본 불변) */
export const applyPreference = (
  envelope: PreferencesEnvelope,
  category: NotificationCategory,
  enabled: boolean,
): PreferencesEnvelope => {
  const exists = envelope.data.preferences.some(
    (row) => row.category === category,
  );
  const preferences = exists
    ? envelope.data.preferences.map((row) =>
        row.category === category ? { ...row, enabled } : row,
      )
    : [...envelope.data.preferences, { category, enabled }];
  return { ...envelope, data: { ...envelope.data, preferences } };
};

/**
 * PATCH 성공 응답(변경 후 전체 상태)을 캐시에 기록한다 (AC 6 — setQueryData 직접 기록).
 * 아직 왕복 중(in-flight)인 다른 카테고리는 현재 캐시의 낙관 값을 보존한다 — 먼저 온
 * 응답이 나중 조작의 낙관 반영을 덮는 경합 차단 (스펙 리스크, AC 6·8 경계).
 */
export const recordServerPreferences = (
  current: PreferencesEnvelope | undefined,
  response: PreferencesEnvelope,
  inFlight: readonly NotificationCategory[],
): PreferencesEnvelope => {
  if (current === undefined || inFlight.length === 0) return response;
  return {
    ...response,
    data: {
      ...response.data,
      preferences: NOTIFICATION_CATEGORIES.map((category) => ({
        category,
        enabled: inFlight.includes(category)
          ? readPreference(current, category)
          : readPreference(response, category),
      })),
    },
  };
};
