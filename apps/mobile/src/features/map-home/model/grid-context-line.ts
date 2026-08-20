import type { CourseSpot } from "./course";

/**
 * 격자 상세의 맥락 줄 파생 (MSG-427 C6·C7) — 웹
 * `features/map-home/model/grid-context-line.ts`의 복제본. "어디서 내려왔는지"를 한 줄로.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 grid-context-line.parity.test.ts가 웹 원본을 동적 import해 단정한다.
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
   * 진행도·상세 조회 실패 — true면 **방문 여부를 주장하지 않는다**. [C7]
   * 실패 시 `visited`가 전부 false로 폴백해 "미방문"이 사실처럼 보이기 때문이다.
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
