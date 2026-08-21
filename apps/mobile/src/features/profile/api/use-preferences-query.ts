import { useQuery } from "@tanstack/react-query";
import { getPreferencesOptions } from "../../../shared/api/query-options";
import {
  readPreferences,
  type PreferenceMap,
} from "../model/notification-toggle";

/**
 * 알림 설정 조회 (기준 4) — `GET /api/notifications/preferences` 생성 옵션 + 5종 병합 파생.
 * 캐시 원본은 **봉투 그대로** 둔다 — 토글 mutation이 같은 키에 낙관 값·서버 응답을
 * `setQueryData`로 직접 쓰기 때문이다(웹 preference-cache 선례). 병합(저장 행 부재=true)은
 * select에서만 파생한다.
 * 화면 진입마다 이 조회가 정본이라 화면을 벗어났다 다시 들어오면 서버 상태가 복원된다.
 */
export const usePreferencesQuery = () =>
  useQuery({
    ...getPreferencesOptions(),
    select: (envelope): PreferenceMap => readPreferences(envelope),
  });
