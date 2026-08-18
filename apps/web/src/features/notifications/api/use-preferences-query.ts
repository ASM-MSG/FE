import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getPreferencesOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import {
  mergePreferences,
  type PreferenceGroupView,
} from "../model/preference-catalog";

/**
 * 알림 preferences 조회 훅 (MSG-409 AC 4·5) — `GET /api/notifications/preferences`
 * 생성 옵션 + 봉투 언랩 + 카탈로그 병합 select (use-profile-query 선례).
 * select는 파생 전용이라 캐시 원본은 봉투 그대로다 — PATCH 성공의 setQueryData 직접
 * 기록(use-preference-mutation)도 같은 키의 봉투에 쓴다.
 */
export const usePreferencesQuery = () =>
  useQuery({
    ...getPreferencesOptions(),
    select: (envelope): PreferenceGroupView[] =>
      mergePreferences(unwrapEnvelope(envelope).preferences),
  });
