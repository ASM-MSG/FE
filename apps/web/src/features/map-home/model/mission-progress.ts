import type { LatLng } from "@/entities/cell";
import { missionCoversGrid, type MissionShape } from "./mission";

/**
 * 미션 개인 진행도 (MSG-395 AC 3·20).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * **서버에 미션별 진행 필드가 없어 프론트가 계산한다** (사용자 확정). 서버가 진행 필드를
 * 주기 시작하면 **이 파일 하나만** 교체하면 되도록 소비처는 `MissionProgress`만 본다.
 *
 * 계산 방향은 "내 격자를 미션에 넣어본다"다(사용자 렉 보고 후 개정) — 미션 격자를 펼쳐
 * 교집합하면 BOX 미션 하나당 81칸을 좌표 변환해야 하고 미션이 170개다. 수집 격자는
 * 30개 남짓이라 뒤집는 쪽이 두 자릿수 배 싸다.
 */

/** 내 수집 격자 — id와 중심 좌표(BOX 포함 판정용). 좌표 변환은 호출부가 1회만 한다 */
export interface CollectedGrid {
  gridId: string;
  center: LatLng;
}

/** 진행도 — 화면의 `n/N칸`·`n/N곳 방문`·완료 배지의 단일 근거 */
export interface MissionProgress {
  done: number;
  total: number;
  completed: boolean;
}

/**
 * 미션 영역에 든 내 수집 격자 수 → 진행도. [AC 3]
 * `targetCount`가 미션 격자 수보다 작을 수 있다(“영역 안 아무 칸이나 1칸”) — 그래서
 * 분모는 격자 수가 아니라 targetCount다.
 * total이 0이면 완료로 보지 않는다 — `done >= 0`이 항상 참이라 전건이 완료가 되고
 * 진행 바도 0으로 나누게 된다.
 */
export const missionProgress = (
  shape: MissionShape,
  collectedGrids: readonly CollectedGrid[],
  targetCount: number,
): MissionProgress => {
  const done = collectedGrids.filter((grid) =>
    missionCoversGrid(shape, grid.gridId, grid.center),
  ).length;

  return {
    done,
    total: targetCount,
    completed: targetCount > 0 && done >= targetCount,
  };
};

/** 진행 바 폭 비율 0~1 — 목표 초과분은 1에서 자른다. [AC 20] */
export const progressRatio = ({ done, total }: MissionProgress): number =>
  total > 0 ? Math.min(1, done / total) : 0;
