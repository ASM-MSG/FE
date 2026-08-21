import type { MissionProgressResponseDto } from "@/shared/api/generated";

/**
 * 미션 개인 진행도 (MSG-395 AC 3·20 → MSG-403 AC 20).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * MSG-395는 서버에 진행 필드가 없어 내 수집 격자를 미션 도형에 넣어 프론트가 계산했고,
 * "서버가 주기 시작하면 이 파일 하나만 교체한다"고 예고했다 — `GET /api/missions/progress`가
 * 열려 그 교체를 수행한 결과가 이 파일이다. 소비처는 종전대로 `MissionProgress`만 본다.
 */

/** 진행도 — 화면의 `n/N칸`·`n/N곳 방문`·완료 배지의 단일 근거 */
export interface MissionProgress {
  done: number;
  total: number;
  completed: boolean;
}

/**
 * 서버 진행도 → 표시 모델. [AC 20]
 * 응답을 **보정하지 않는다**: 스탬프는 비회수라 영상을 다 지우면 `0/1 + 완료`가 되는데,
 * 이는 서버가 정의한 정상 상태다(명세). 프론트가 완료를 끄면 스탬프를 받은 사용자에게
 * 미완으로 보인다.
 * 아직 진행도를 못 받은 미션(조회 전·응답 누락)은 목록이 준 `targetCount`만 쓰고 완료를
 * 주장하지 않는다 — 실패 노출은 소비처의 `progressFailed`가 맡는다.
 */
export const toMissionProgress = (
  dto: MissionProgressResponseDto | undefined,
  targetCount: number,
): MissionProgress =>
  dto === undefined
    ? { done: 0, total: targetCount, completed: false }
    : {
        done: dto.filledCount,
        total: dto.targetCount,
        completed: dto.completed,
      };

/** 진행 바 폭 비율 0~1 — 목표 초과분은 1에서 자른다. [AC 20] */
export const progressRatio = ({ done, total }: MissionProgress): number =>
  total > 0 ? Math.min(1, done / total) : 0;
