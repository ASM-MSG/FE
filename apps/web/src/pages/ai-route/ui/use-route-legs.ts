import { useMemo } from "react";
import { useWalkPathsQuery } from "@/features/ai-route/api/use-walk-paths-query";
import {
  buildRouteLegs,
  type RouteLeg,
} from "@/features/ai-route/model/route-legs";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * 구간 목록 훅 — 카드 사이 "도보 약 Nm" 커넥터의 데이터원 (MSG-490 §4-2).
 * 실보행 거리가 오기 전·요청 실패에는 `segments`가 undefined라 직선 근사가 그대로 남는다
 * (점진 렌더가 공짜인 이유 — 별도 상태 전이·타이머가 없다).
 *
 * 같은 `points`로 오버레이 게시 훅도 같은 쿼리를 부르지만 queryKey가 같아 실요청은 1회다(Q5).
 */
export const useRouteLegs = (points: RoutePointDto[]): RouteLeg[] => {
  const { segments } = useWalkPathsQuery(points);

  // 래퍼 객체를 매 렌더 새로 만들면 아래 useMemo가 매번 깨진다 (§8 R6 — PR #104가 잡은 자리)
  // [MSG-489 확장점] origin이 스토어에 생기면 `originOffset: 1`을 함께 넘긴다 (§8 R2)
  const walk = useMemo(() => (segments ? { segments } : undefined), [segments]);

  return useMemo(() => buildRouteLegs(points, walk), [points, walk]);
};
