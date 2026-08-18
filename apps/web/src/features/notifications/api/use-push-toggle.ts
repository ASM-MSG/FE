import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  registerMutation,
  unregisterMutation,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { usePushNoticeStore } from "../model/push-notice-store";
import { isPushSupported } from "../model/push-support";
import { derivePushToggleState } from "../model/push-toggle";
import { usePushTokenStore } from "../model/push-token-store";
import {
  fetchFcmToken,
  getPermission,
  readPushCapabilities,
  requestPermission,
} from "./messaging";

// 생성 팩토리는 mutationFn을 항상 채운다 — 타입만 optional이라 !로 좁힌다 (use-profile-mutations 패턴)
const registerFn = registerMutation().mutationFn!;
const unregisterFn = unregisterMutation().mutationFn!;

/**
 * 프로필 "알림 받기" 토글 훅 (MSG-408 AC 4·5·6·7·8·13) — 신규 푸시 등록의 유일한 진입점
 * (스펙 결정 1). 표시 정본 = 권한 granted && 보관 토큰 존재 (derivePushToggleState).
 * - ON: 클릭(사용자 제스처) 컨텍스트에서 requestPermission → granted면 getToken → POST 등록
 *   → 보관. denied(dismiss 포함)면 브라우저 설정 안내 노출 (AC 5·6)
 * - OFF: 보관 토큰으로 DELETE, **성공 시에만** 보관을 비운다 — 실패 시 보관·ON 유지 +
 *   오류 안내로 재시도 가능 상태를 남긴다 (AC 7 정정 — codex 리뷰 1: 실패에 비우면 서버
 *   등록이 남은 채 UI만 OFF가 되고, 자동 동기화(보관 토큰 전제)의 재해제 경로가 소멸)
 * - 등록/해제 실패는 오류 안내를 노출한다 — 조용한 실패 금지 (AC 13 + codex 리뷰 3).
 *   등록 실패 시 보관하지 않아 토글이 실제 결과와 어긋나지 않는다
 * - 안내(denied/error)는 push-notice-store로 push한다 — 표시·닫기는 PushNoticeHost의
 *   단일 스택 몫 (PR #60 리뷰 3: ProfilePanel 자체 토스트와 호스트의 겹침 해소)
 */
export const usePushToggle = () => {
  const token = usePushTokenStore((s) => s.token);
  const setToken = usePushTokenStore((s) => s.setToken);
  const clearToken = usePushTokenStore((s) => s.clearToken);
  const refresh = usePushTokenStore((s) => s.refresh);
  // 외부 기록자(로그아웃)가 보관만 비웠을 수 있다 — 마운트 시 저장소 실값과 정렬
  useEffect(() => {
    refresh();
  }, [refresh]);

  const showNotice = usePushNoticeStore((s) => s.showToggleNotice);
  const dismissNotice = usePushNoticeStore((s) => s.dismissToggleNotice);

  const enable = useMutation({
    mutationFn: async (_variables: void, context) => {
      // 권한 요청은 이 mutationFn(클릭 핸들러의 동기 연쇄) 안 — 제스처 컨텍스트 유지 (AC 5)
      const permission = await requestPermission();
      if (permission !== "granted") return { granted: false as const };
      const fcmToken = await fetchFcmToken();
      await registerFn({ body: { fcmToken, platform: "WEB" } }, context);
      return { granted: true as const, fcmToken };
    },
    onSuccess: (result) => {
      if (result.granted) {
        setToken(result.fcmToken);
        dismissNotice();
      } else {
        showNotice("denied"); // 토글은 OFF 유지 + 브라우저 설정 안내 (AC 6)
      }
    },
    // 등록 실패 — 보관하지 않아 OFF 유지(AC 13) + 오류 안내 (codex 리뷰 3)
    onError: () => showNotice("error"),
  });

  const disable = useMutation({
    mutationFn: async (storedToken: string, context) => {
      await unregisterFn({ query: { fcmToken: storedToken } }, context);
    },
    // 성공 시에만 비운다 — 실패 시 보관·ON 유지로 재시도 경로를 남긴다 (AC 7 정정, codex 리뷰 1)
    onSuccess: () => {
      clearToken();
      dismissNotice();
    },
    onError: () => showNotice("error"),
  });

  const state = derivePushToggleState({
    supported: isPushSupported(readPushCapabilities()),
    permission: getPermission(),
    hasStoredToken: token !== null,
  });

  const setEnabled = (next: boolean): void => {
    if (next) enable.mutate();
    else if (token !== null) disable.mutate(token);
  };

  return {
    supported: state.supported,
    checked: state.checked,
    isPending: enable.isPending || disable.isPending,
    setEnabled,
  };
};
