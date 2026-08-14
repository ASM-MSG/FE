import type { DexSummary } from "@/entities/dex";

/**
 * 도감 요약 표시 파생 (MSG-327 기준 2·4).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 *
 * 구 `deriveDexView`·`formatExploredPct`·`selectRecentCells`는 MSG-327에서 폐기됐다:
 * mock 단일 응답을 뷰 모델로 접는 함수였는데 이제 응답이 4개로 갈려 조합은 패널이 하고,
 * "전체 지도 N% 탐험"은 대응 명세 축이 없어 문구 자체가 교체됐다(사용자 확정).
 */

/** 탐험률을 0~100으로 클램프한다 — 서버 clamp(100 상한)의 이중 방어 겸 음수 방어. [기준 4] */
export const clampPct = (value: number): number =>
  Math.min(100, Math.max(0, value));

/**
 * 프로필 헤더 보조 문구 — "동네 N곳 · 격자 M개 탐험". [기준 2]
 * 명세에 전체 지도 대비 탐험률 축이 없어, 요약이 실제로 주는 두 수치
 * (visitedRegionCount·totalGridCount)로 탐험 규모를 표현한다 (사용자 확정 2026-08-14).
 */
export const formatExploreSummary = ({
  visitedRegionCount,
  totalGridCount,
}: Pick<DexSummary, "visitedRegionCount" | "totalGridCount">): string =>
  `동네 ${visitedRegionCount}곳 · 격자 ${totalGridCount}개 탐험`;
