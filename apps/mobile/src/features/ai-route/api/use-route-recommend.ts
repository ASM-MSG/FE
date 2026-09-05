import { useMutation } from "@tanstack/react-query";
import { aiRouteStore } from "../model/ai-route-store";
import type { RouteAutoMove } from "../model/route-mentioned-area";
import { recommendMutationOptions } from "./route-recommend-mutation";

/**
 * 추천 요청 훅 (MSG-556) — 옵션 팩토리(route-recommend-mutation)에 앱 전역 스토어를 물린다.
 * 로그인 이동은 **훅 레벨 옵션**으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시
 * 유실된다(웹 MSG-325 선례). 라우터 어댑터(`goToLogin`)는 화면이 주입한다 (RN 경계).
 * MSG-559: 자동 이동 콜백·2차 인스턴스 플래그를 팩토리로 그대로 넘긴다.
 */
export const useRouteRecommend = (callbacks: {
  onLoginRequired: () => void;
  onAutoMove?: (move: RouteAutoMove) => void;
  secondary?: boolean;
}) =>
  useMutation(recommendMutationOptions({ store: aiRouteStore, ...callbacks }));
