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
 * 프로필 헤더 보조 문구 — "격자 N개 · 영상 M개 기록". [기준 2]
 * 명세에 전체 지도 대비 탐험률 축이 없어, 요약이 실제로 주는 수치로 활동 규모를 표현한다.
 * "기록"은 뱃지 시스템이 업로드 축(UPLOAD_COUNT = 기록러, "영상 N개를 기록했어요")에 쓰는
 * 동사라 앱 안의 말이 통일된다. 격자는 수치만으로 의미가 서서 동사를 따로 붙이지 않는다
 * (사용자 확정 2026-08-14 — 초안의 visitedRegionCount 기반 문구를 대체).
 */
export const formatExploreSummary = ({
  totalGridCount,
  totalVideoCount,
}: Pick<DexSummary, "totalGridCount" | "totalVideoCount">): string =>
  `격자 ${totalGridCount}개 · 영상 ${totalVideoCount}개 기록`;
