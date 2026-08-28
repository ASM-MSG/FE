import { useMemo } from "react";
import {
  buildRouteLegs,
  type RouteLeg,
} from "@/features/ai-route/model/route-legs";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * 구간 목록 훅 — 카드 사이 "도보 약 Nm" 커넥터의 데이터원.
 *
 * [MSG-490 확장점] 구간 거리 소스 — 지금은 직선(route-legs), 실보행 경로로 교체된다.
 */
export const useRouteLegs = (points: RoutePointDto[]): RouteLeg[] =>
  useMemo(() => buildRouteLegs(points), [points]);
