import type { UseMutationOptions } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { recommendMutation } from "../../../shared/api/query-options";
import type { RouteRecommendRequestDto } from "../../../shared/api/sdk";
import type { AiRouteStore } from "../model/ai-route-store";
import { routeErrorNotice } from "../model/route-error";

/**
 * AI 경로 추천 mutation 옵션 (L10, MSG-556) — `POST /api/routes/recommend`를 1회 쏜다.
 * 웹 `use-route-recommend.ts`의 모바일판. 생성 SDK mutation 옵션 기반(직접 fetch·URL 없음),
 * 봉투 언랩 → 스토어 게시까지가 이 팩토리의 계약이고 화면 분기는 스토어를 구독한다.
 *
 * 훅이 아니라 **옵션 팩토리**로 두는 것은 MSG-426이 확립한 모바일 관례다 — RN 렌더 테스트
 * 인프라가 없어 테스트가 이 객체를 `MutationObserver`로 직접 구동한다. 스토어·로그인 이동은
 * 주입받는다(expo-router가 딸려 오는 `shared/navigation`을 테스트가 로드하지 않는다).
 * 얇은 훅은 `use-route-recommend.ts`가 소유한다.
 *
 * mutation은 TanStack 기본 `retry: 0`이라 14429(10초 제한)가 자동 재시도로 악화되지 않는다.
 * 쿼리 무효화가 없는 것은 의도다 — body가 필요해 POST일 뿐 **읽기형**이라 낡아질 캐시가 없다
 * (웹 2026-08-29 판정).
 *
 * [MSG-489 확장점] mentionedArea 자동 이동 분기 — 지금은 `data.points`·`notice`만 읽는다.
 */
// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const recommendFn = recommendMutation().mutationFn!;

export const recommendMutationOptions = ({
  store,
  onLoginRequired,
}: {
  store: AiRouteStore;
  /** 401(2403) — 입력을 유지한 채 대기로 돌아가고 로그인 화면으로 보낸다 (§1-4) */
  onLoginRequired: () => void;
}): UseMutationOptions<
  Awaited<ReturnType<typeof recommendFn>>,
  Error,
  RouteRecommendRequestDto
> => ({
  mutationFn: (body, context) => recommendFn({ body }, context),
  // 이전 결과·선택은 요청 시작 시점에 비운다 — 로딩 화면에 잔상이 남지 않는다 (L9)
  onMutate: () => store.startRequest(),
  onSuccess: (response) => {
    const data = unwrapEnvelope(response);
    store.succeed(data.points, data.notice);
  },
  onError: (error) => {
    const notice = routeErrorNotice(error);
    store.fail(notice);
    if (notice.requiresLogin) onLoginRequired();
  },
});
