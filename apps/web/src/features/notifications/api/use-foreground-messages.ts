import { useEffect, useRef, useState } from "react";
import { isPushSupported } from "../model/push-support";
import { usePushTokenStore } from "../model/push-token-store";
import {
  getPermission,
  readPushCapabilities,
  subscribeForegroundMessages,
} from "./messaging";

/** 화면 표시용 포그라운드 통지 — id는 세션 로컬 일련번호 (닫기 식별용) */
export interface PushNotice {
  id: number;
  title: string;
  body?: string;
}

/**
 * 포그라운드 onMessage 구독 → 통지 상태 (MSG-408 AC 10) — PushNoticeHost 전용.
 * 지원 && 권한 granted && 보관 토큰 존재(등록자)일 때만 구독한다 — 토글 ON으로 토큰이
 * 생기면 store 구독으로 effect가 재실행돼 뒤늦게 구독된다. 구독 실패는 콘솔 경고로만
 * 남긴다 (AC 13 관례). 표시는 제목·본문·닫기만 — 딥링크 없음 (추정 4).
 */
export const useForegroundMessages = () => {
  const token = usePushTokenStore((s) => s.token);
  const [notices, setNotices] = useState<PushNotice[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (token === null) return;
    if (!isPushSupported(readPushCapabilities())) return;
    if (getPermission() !== "granted") return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    subscribeForegroundMessages((message) => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setNotices((prev) => [
        ...prev,
        { id, title: message.title ?? "새 알림", body: message.body },
      ]);
    })
      .then((unsub) => {
        if (disposed) unsub();
        else unsubscribe = unsub;
      })
      .catch((error: unknown) => {
        console.warn("[notifications] 포그라운드 수신 구독 실패", error);
      });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [token]);

  const dismiss = (id: number): void =>
    setNotices((prev) => prev.filter((notice) => notice.id !== id));

  return { notices, dismiss };
};
