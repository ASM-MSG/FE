import type { LatLng } from "@/entities/cell";
import type { MissionResponseDto } from "@/shared/api/generated";
import {
  courseSpots,
  isLoopCourse,
  parseLineString,
  type CourseSpot,
} from "./course";
import type { MissionProgressResponseDto } from "@/shared/api/generated";
import { missionShapeOf, type MissionShape } from "./mission";
import { decodeHtmlEntities } from "./mission-format";
import { toMissionProgress, type MissionProgress } from "./mission-progress";
import { missionStatus, type MissionStatus } from "./mission-status";

/**
 * 미션 표시 모델 (MSG-395) — 목록 카드·상세 패널·지도 오버레이가 공유하는 단일 파생.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 세 소비처가 각자 도형·진행도·상태를 다시 계산하면 같은 미션이 카드에서는 완료,
 * 지도에서는 미완으로 보이는 어긋남이 난다 — 한 번 만들어 내려보낸다.
 * **격자를 미리 펼치지 않는다** — 지도에 그릴 때 뷰포트 범위로만 펼친다(mission.ts 주석).
 */
export interface MissionView {
  /** 원본 응답 — 이미지·기간 등 표시 전용 필드는 뷰가 직접 읽는다 */
  dto: MissionResponseDto;
  missionId: number;
  title: string;
  /** 장소 한 줄 — 엔티티 복원본. 서버 원문은 dto.placeName */
  placeName: string | null;
  /** 판별된 도형 — 오버레이가 뷰포트 범위로 격자를 펼칠 때 쓴다 */
  shape: MissionShape;
  progress: MissionProgress;
  status: MissionStatus;
}

export const toMissionView = (
  dto: MissionResponseDto,
  progressDto: MissionProgressResponseDto | undefined,
  now: Date,
): MissionView => {
  const shape = missionShapeOf(dto);
  const progress = toMissionProgress(progressDto, dto.targetCount);

  return {
    dto,
    missionId: dto.missionId,
    // 서버가 제목·장소명을 HTML 이스케이프한 채 보낸다(실측) — 화면에 그대로 두면
    // 사용자가 `&#x27;`를 읽는다
    title: decodeHtmlEntities(dto.title),
    placeName:
      dto.placeName === null ? null : decodeHtmlEntities(dto.placeName),
    shape,
    progress,
    status: missionStatus({
      startAt: dto.startAt,
      endAt: dto.endAt,
      completed: progress.completed,
      now,
    }),
  };
};

/** 코스 표시 모델 — 미션 공통 파생 + 라인·포토스팟·순환 여부 */
export interface CourseView extends MissionView {
  path: LatLng[];
  spots: CourseSpot[];
  loop: boolean;
}

/**
 * 코스 표시 모델 — 방문 격자 집합은 **미션 상세의 스팟 통계**에서 온다 (MSG-403 AC 21).
 * 상세를 열기 전(목록)에는 빈 집합이라 스팟 행 자체가 안 보이므로 표시에 영향이 없다.
 */
export const toCourseView = (
  dto: MissionResponseDto,
  progressDto: MissionProgressResponseDto | undefined,
  visitedGridIds: ReadonlySet<string>,
  now: Date,
): CourseView => {
  const view = toMissionView(dto, progressDto, now);
  const path = parseLineString(view.shape.line);

  return {
    ...view,
    path,
    spots: courseSpots(view.shape.spots, visitedGridIds),
    loop: isLoopCourse(path),
  };
};
