import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { heartbeat } from "@/shared/api/generated/sdk.gen";
import { viewerSessionStorage } from "@/shared/storage";

/** heartbeat 전송 주기 (확정 2) — 서버 처방 그대로 30초 (집계 창 90초) */
export const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * 행사방 열람 heartbeat (MSG-517 AC 5, 확정 2·3) —
 * `POST /api/event-occurrences/{occurrenceId}/heartbeat`.
 * 행사방이 열려 있는 동안(occurrenceId 존재) 즉시 1회 + 30초 주기로 보낸다 — 이것이
 * 있어야 웹 열람자 자신이 "N명 보는 중"에 잡힌다. 닫힘·언마운트 시 중단.
 *
 * 비로그인은 `X-Viewer-Session` 헤더(탭 세션 고정 UUID — shared/storage 어댑터 경유,
 * RN 경계)가 필수(없으면 400)이고, 로그인은 bearer가 세션 식별자라 싣지 않는다.
 * 전송 실패는 삼킨다 — 열람 신호는 유실돼도 다음 주기가 자연 재시도다 (AC 4와 동일 정신).
 */
export const useEventHeartbeat = (occurrenceId: number | null): void => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (occurrenceId === null) return;

    const send = () => {
      heartbeat({
        path: { occurrenceId },
        headers: isAuthenticated
          ? undefined
          : { "X-Viewer-Session": viewerSessionStorage.get() },
      }).catch(() => {
        // 무해화 — 다음 주기 전송이 재시도다
      });
    };

    send();
    const timer = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [occurrenceId, isAuthenticated]);
};
