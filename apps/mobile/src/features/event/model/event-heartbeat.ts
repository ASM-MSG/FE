/**
 * 행사방 열람 heartbeat의 순수 구동부 (MSG-560 D9, 사용자 결정 Q3).
 * 웹 `use-event-heartbeat.ts`를 포팅하되 **로그인 사용자만** 보낸다 — 익명 분기
 * (`X-Viewer-Session`)는 RN 저장소 어댑터가 선행돼야 해 이번 범위 밖이다.
 *
 * 훅(`api/use-event-heartbeat`)과 분리한 이유: 훅은 `features/auth`의 `useAuth`를 읽는데
 * 그 모듈이 expo-secure-store를 정적으로 끌고 와 vitest에서 로드되지 않는다(MSG-426 관례 —
 * "옵션 팩토리 + 얇은 훅"). 타이머 계약은 여기서 고정한다.
 */

/** 전송 주기 — 서버 처방 그대로 30초 (집계 창 90초) */
export const HEARTBEAT_INTERVAL_MS = 30_000;

interface EventHeartbeatInput {
  /** 열린 행사방 — null이면 보내지 않는다 */
  occurrenceId: number | null;
  isAuthenticated: boolean;
  /** 전송 어댑터 — 실패는 이 함수가 삼킨다(다음 주기가 재시도) */
  send: (occurrenceId: number) => Promise<unknown>;
}

/** 즉시 1회 + 30초 주기 전송을 시작하고 정지 함수를 돌려준다. 보내지 않으면 undefined */
export const startEventHeartbeat = ({
  occurrenceId,
  isAuthenticated,
  send,
}: EventHeartbeatInput): (() => void) | undefined => {
  if (occurrenceId === null || !isAuthenticated) return undefined;

  const tick = () => {
    void send(occurrenceId).catch(() => {
      // 무해화 — 열람 신호는 유실돼도 다음 주기가 자연 재시도다
    });
  };

  tick();
  const timer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
  return () => clearInterval(timer);
};
