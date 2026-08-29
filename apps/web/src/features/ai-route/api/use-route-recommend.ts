import { useMutation } from "@tanstack/react-query";
// 생성 mutation 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { recommendMutation } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RouteRecommendRequestDto } from "@/shared/api/generated";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { useAiRouteStore } from "../model/ai-route-store";
import { routeErrorNotice } from "../model/route-error";
import {
  type RouteAutoMove,
  resolveAutoMove,
} from "../model/route-mentioned-area";

/**
 * AI 경로 추천 요청 (MSG-488 §4-3) — `POST /api/routes/recommend`를 1회 쏜다.
 * 생성 SDK mutation 옵션 기반(직접 fetch·URL 하드코딩 없음, use-video-mutations 패턴 미러).
 * 봉투 언랩 → 스토어 게시까지가 이 훅의 계약이고, 화면 분기는 스토어를 구독한다.
 *
 * mutation은 TanStack 기본 `retry: 0`이라 14429(10초 제한)가 자동 재시도로 악화되지 않는다.
 * 콜백은 훅 레벨 옵션으로 받는다 — mutate per-call 콜백은 관찰자 언마운트 시 유실된다(MSG-325 선례).
 *
 * MSG-489: 응답에 `mentionedArea`가 실리면 **결과를 게시하지 않고**(D5) 2차 요청을 예약한다.
 * 2차 인스턴스(`secondary: true`)는 예약 플래그를 보존한 채 로딩만 이어 간다 —
 * `startRequest`를 쓰면 `autoMoved`가 초기화돼 2차 응답에서 또 이동하는 무한 루프가 된다.
 */
// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const recommendFn = recommendMutation().mutationFn!;

export const useRouteRecommend = (callbacks?: {
  /** 401(2403) — 패널은 입력을 유지한 채 입력 대기로 돌아가고 로그인 모달만 연다 (§1-3) */
  onLoginRequired?: () => void;
  /** 언급 지역 신호 도착 — 지도 이동·2차 발사는 뷰-레이어 오케스트레이터가 맡는다 (D2·D4) */
  onAutoMove?: (move: RouteAutoMove) => void;
  /** 2차 자동 재요청 인스턴스인가 — 요청 시작 처리가 갈린다 */
  secondary?: boolean;
}) => {
  const startRequest = useAiRouteStore((s) => s.startRequest);
  const startSecondaryRequest = useAiRouteStore((s) => s.startSecondaryRequest);
  const markSecondarySent = useAiRouteStore((s) => s.markSecondarySent);
  const succeed = useAiRouteStore((s) => s.succeed);
  const fail = useAiRouteStore((s) => s.fail);

  return useMutation({
    mutationFn: (body: RouteRecommendRequestDto, context) =>
      recommendFn({ body }, context),
    // 이전 결과·선택은 요청 시작 시점에 비운다 — 로딩 화면에 잔상이 남지 않는다 (L7)
    onMutate: (body) => {
      const originSent = body.origin !== undefined;
      if (callbacks?.secondary) markSecondarySent(originSent);
      else startRequest(originSent);
    },
    onSuccess: (response) => {
      const data = unwrapEnvelope(response);
      // 이동 여부는 스토어 현재값으로 판정한다 — 2차 응답은 alreadyMoved라 항상 null (L9·L17)
      const move = resolveAutoMove({
        mentionedArea: data.mentionedArea,
        alreadyMoved: useAiRouteStore.getState().autoMoved,
      });
      if (move === null) {
        succeed(data.points, data.notice);
        return;
      }
      // 1차 결과는 스토어에도 오버레이에도 게시하지 않고 로딩을 유지한다 (D5)
      startSecondaryRequest(move.areaName);
      callbacks?.onAutoMove?.(move);
    },
    onError: (error) => {
      const notice = routeErrorNotice(error);
      fail(notice);
      if (notice.requiresLogin) callbacks?.onLoginRequired?.();
    },
  });
};
