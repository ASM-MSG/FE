import type { CourseSpot } from "./course";

/**
 * 격자 상세의 맥락 줄 파생 (MSG-395) — "어디서 내려왔는지"를 한 줄로.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 훅에서 떼어낸 이유: 진행도 조회 실패 시 방문 여부를 주장하면 안 된다는 규칙이
 * 여기 들어오면서 분기가 늘었는데, 훅 안에 두면 쿼리 4개를 스텁해야 검증할 수 있다.
 */
interface GridContextInput {
  /** 선택 격자가 코스 스팟이면 그 스팟 */
  spot: CourseSpot | null;
  courseTitle: string | undefined;
  /** 핫구역 칩에서 연 상세인지 */
  isHotChip: boolean;
  hotGridCount: number;
  /** 점령 시작일 표시 문자열 — 없으면 그 조각을 넣지 않는다 */
  collectedSinceLabel: string | null;
  /**
   * 내 수집 격자 조회 실패 — true면 **방문 여부를 주장하지 않는다**.
   * 실패 시 `visited`가 전부 false로 폴백해 "미방문"이 사실처럼 보이기 때문이다
   * (목록에서 진행도 안내를 띄우는 것과 같은 규칙, 리뷰 반영).
   */
  progressFailed: boolean;
}

export const gridContextLine = ({
  spot,
  courseTitle,
  isHotChip,
  hotGridCount,
  collectedSinceLabel,
  progressFailed,
}: GridContextInput): string | undefined => {
  if (spot) {
    const position = `${courseTitle} ${spot.order}번째 스팟`;
    if (progressFailed) return position;
    return `${position} · ${spot.visited ? "방문 완료" : "미방문"}`;
  }

  if (!isHotChip) return undefined;

  return [
    `핫구역 안 ${hotGridCount}칸`,
    // 점령 시작일도 수집 격자 조회에서 오므로, 실패 시엔 없는 것과 구분되지 않는다
    progressFailed ? null : collectedSinceLabel,
  ]
    .filter(Boolean)
    .join(" · ");
};
