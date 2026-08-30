import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { walkPaths } from "@/shared/api/generated/sdk.gen";
import type { SegmentDto, WalkSegmentDto } from "@/shared/api/generated";
import {
  buildWalkSegments,
  isWithinKoreaRange,
  type RouteStopGeo,
} from "../model/route-legs";

/**
 * 세그먼트 보행 경로 조회 (MSG-490 §4-2) — `POST /api/routes/walk-paths`.
 * body가 필요해 POST일 뿐 **조회**라 mutation이 아니라 useQuery다: 결과가 바뀌면 키가 바뀌고
 * 이전 응답이 버려지며(경합 차단) 세션 동안 보관되는 계약이 필요하다.
 *
 * - **queryKey = 세그먼트 좌표 자체**: 서버 응답에 결과 id가 없어 좌표가 곧 결과 식별자다.
 *   새 추천 결과는 다른 키를 만들고, 늦게 온 이전 응답은 그 키의 캐시에만 앉는다 (L13·S5)
 * - **retry: false**(Q7): 조용한 폴백이 계약이라 503(14504)을 두 번 더 두드릴 이유가 없다.
 *   실패는 던지지 않고 `segments: undefined`로 끝나며 소비자는 직선을 유지한다 (L15)
 * - **staleTime·gcTime Infinity**(Q6): 섹션 왕복에도 재요청 0회. 로그아웃 시 QueryProvider가
 *   전량 clear하므로 보관 수명이 세션 경계와 일치한다 (S6)
 *
 * 지도 SDK를 import하지 않는다(RN 경계) — 좌표열은 순수 모델(route-legs·route-overlay)이 쓴다.
 */

export const walkPathsQueryKey = (segments: SegmentDto[]) =>
  ["ai-route", "walk-paths", segments] as const;

export const useWalkPathsQuery = (
  points: RouteStopGeo[],
): { segments: WalkSegmentDto[] | undefined } => {
  // 방문 순서 정렬은 route-legs·route-overlay와 같은 규칙이라야 인덱스 대응이 맞는다
  const stops = useMemo(
    () =>
      [...points]
        .sort((a, b) => a.order - b.order)
        .map(({ lat, lng }) => ({ lat, lng })),
    [points],
  );
  const segments = useMemo(() => buildWalkSegments(stops), [stops]);

  const { data } = useQuery({
    queryKey: walkPathsQueryKey(segments),
    queryFn: async ({ signal }) => {
      const response = await walkPaths({
        body: { segments },
        signal,
        throwOnError: true,
      });
      return unwrapEnvelope(response.data);
    },
    // 좌표가 하나라도 한국 범위 밖이면 서버가 요청 전체를 400으로 거절한다 — 왕복 자체를 생략 (L14, Q3)
    enabled: segments.length > 0 && isWithinKoreaRange(stops),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return { segments: data?.segments };
};
