import { useEffect } from "react";
import { heartbeat } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import { startEventHeartbeat } from "../model/event-heartbeat";

/**
 * 행사방 열람 heartbeat (MSG-560 D9, 사용자 결정 Q3) —
 * `POST /api/event-occurrences/{occurrenceId}/heartbeat`. 방이 열려 있는 동안(개요·위치
 * 상세 모두 열람이다) 즉시 1회 + 30초 주기로 보낸다 — 이것이 있어야 앱 열람자 자신이
 * "N명 보는 중"에 잡힌다.
 *
 * **로그인 사용자만 보낸다**: 서버는 로그인이면 bearer가 세션 식별자라 헤더가 필요 없고,
 * 익명은 `X-Viewer-Session`이 필수(없으면 400)인데 그 저장소는 RN 어댑터 신설이 선행이라
 * 이번 범위 밖이다. 타이머 계약은 `model/event-heartbeat`(순수)가 갖는다 — 이 파일은
 * expo-secure-store를 끌고 오는 `auth-session`을 읽어 vitest에서 로드되지 않는다.
 */
export const useEventHeartbeat = (occurrenceId: number | null): void => {
  const { isAuthenticated } = useAuth();

  useEffect(
    () =>
      startEventHeartbeat({
        occurrenceId,
        isAuthenticated,
        send: (id) => heartbeat({ path: { occurrenceId: id } }),
      }),
    [occurrenceId, isAuthenticated],
  );
};
