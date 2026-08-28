import { useMutation } from "@tanstack/react-query";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { recommendMutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RouteRecommendRequestDto } from "@/shared/api/generated";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { useAiRouteStore } from "../model/ai-route-store";
import { routeErrorNotice } from "../model/route-error";

/**
 * AI 경로 추천 요청 (MSG-488 §4-3) — `POST /api/routes/recommend`를 1회 쏜다.
 * 생성 SDK mutation 옵션 기반(직접 fetch·URL 하드코딩 없음, use-video-mutations 패턴 미러).
 * 봉투 언랩 → 스토어 게시까지가 이 훅의 계약이고, 화면 분기는 스토어를 구독한다.
 *
 * mutation은 TanStack 기본 `retry: 0`이라 14429(10초 제한)가 자동 재시도로 악화되지 않는다.
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325 선례).
 *
 * [MSG-489 확장점] 2차 자동 재요청 트리거가 이 훅에 얹힌다.
 */
// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const recommendFn = recommendMutation().mutationFn!;

export const useRouteRecommend = (callbacks?: {
  /** 401(2403) — 패널은 입력을 유지한 채 입력 대기로 돌아가고 로그인 모달만 연다 (§1-3) */
  onLoginRequired?: () => void;
}) => {
  const startRequest = useAiRouteStore((s) => s.startRequest);
  const succeed = useAiRouteStore((s) => s.succeed);
  const fail = useAiRouteStore((s) => s.fail);

  return useMutation({
    mutationFn: (body: RouteRecommendRequestDto, context) =>
      recommendFn({ body }, context),
    // 이전 결과·선택은 요청 시작 시점에 비운다 — 로딩 화면에 잔상이 남지 않는다 (L7)
    onMutate: () => startRequest(),
    onSuccess: (response) => {
      const data = unwrapEnvelope(response);
      succeed(data.points, data.notice);
    },
    onError: (error) => {
      const notice = routeErrorNotice(error);
      fail(notice);
      if (notice.requiresLogin) callbacks?.onLoginRequired?.();
    },
  });
};
