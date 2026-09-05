import type { UseMutationOptions } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { recommendMutation } from "../../../shared/api/query-options";
import type { RouteRecommendRequestDto } from "../../../shared/api/sdk";
import type { AiRouteStore } from "../model/ai-route-store";
import { routeErrorNotice } from "../model/route-error";
import {
  type RouteAutoMove,
  resolveAutoMove,
} from "../model/route-mentioned-area";

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
 * 응답은 `onMutate`가 돌려준 요청 토큰(mutation context)을 스토어와 대조한 뒤에만 게시한다 —
 * 로딩 중 뒤로가기(`dismissResult`)·로그아웃(`reset`)·재제출 뒤에 도착한 응답은 버린다.
 * mutation 자체는 취소하지 않는다(생성 SDK 옵션에 abort 배선이 없고, 버리는 것으로 충분하다).
 *
 * MSG-559: 응답에 `mentionedArea`가 실리면 **결과를 게시하지 않고**(웹 D5) 2차 요청을
 * 예약한다. 2차 인스턴스(`secondary: true`)는 예약 플래그를 보존한 채 로딩만 이어 간다 —
 * `startRequest`를 쓰면 `autoMoved`가 초기화돼 2차 응답에서 또 이동하는 무한 루프가 된다.
 */
// 생성 팩토리는 mutationFn을 항상 채운다 — UseMutationOptions 타입만 optional이라 !로 좁힌다
const recommendFn = recommendMutation().mutationFn!;

export const recommendMutationOptions = ({
  store,
  onLoginRequired,
  onAutoMove,
  secondary = false,
}: {
  store: AiRouteStore;
  /** 401(2403) — 입력을 유지한 채 대기로 돌아가고 로그인 화면으로 보낸다 (§1-4) */
  onLoginRequired: () => void;
  /** 언급 지역 신호 도착 — 카메라 이동·2차 발사는 뷰-레이어 훅이 맡는다 (L10) */
  onAutoMove?: (move: RouteAutoMove) => void;
  /** 2차 자동 재요청 인스턴스인가 — 요청 시작 처리가 갈린다 */
  secondary?: boolean;
}): UseMutationOptions<
  Awaited<ReturnType<typeof recommendFn>>,
  Error,
  RouteRecommendRequestDto,
  number
> => ({
  mutationFn: (body, context) => recommendFn({ body }, context),
  // 이전 결과·선택은 요청 시작 시점에 비운다 — 로딩 화면에 잔상이 남지 않는다 (L9).
  // 반환값(요청 토큰)이 onSuccess·onError의 context로 돌아온다.
  // 2차는 사이클을 새로 열지 않고 예약만 소비한다 — 같은 토큰을 이어받는다
  onMutate: (body) => {
    const originSent = body.origin !== undefined;
    return secondary
      ? store.markSecondarySent(originSent)
      : store.startRequest(originSent);
  },
  onSuccess: (response, _body, token) => {
    if (!store.isCurrentRequest(token)) return;
    const data = unwrapEnvelope(response);
    // 이동 여부는 스토어 현재값으로 판정한다 — 2차 응답은 alreadyMoved라 항상 null (L10)
    const move = resolveAutoMove({
      mentionedArea: data.mentionedArea,
      alreadyMoved: store.getState().autoMoved,
    });
    if (move === null) {
      store.succeed(data.points, data.notice);
      return;
    }
    // 1차 결과는 스토어에도 오버레이에도 게시하지 않고 로딩을 유지한다 (웹 D5)
    store.startSecondaryRequest(move.areaName, move.center);
    onAutoMove?.(move);
  },
  onError: (error, _body, token) => {
    if (!store.isCurrentRequest(token)) return;
    const notice = routeErrorNotice(error);
    store.fail(notice);
    if (notice.requiresLogin) onLoginRequired();
  },
});
