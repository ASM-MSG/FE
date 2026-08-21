import type { LatLng } from "../../../entities/cell/model/grid";
import type {
  MissionProgressResponseDto,
  MissionResponseDto,
} from "../../../shared/api/sdk";
import {
  coursePath,
  courseSpots,
  isLoopCourse,
  type CourseSpot,
} from "./course";
import { missionShapeOf, type MissionShape } from "./mission";
import { decodeHtmlEntities } from "./mission-format";
import { toMissionProgress, type MissionProgress } from "./mission-progress";
import { missionStatus, type MissionStatus } from "./mission-status";

/**
 * 미션 표시 모델 (MSG-427) — 웹 `features/map-home/model/mission-view.ts`의 복제본.
 * 목록 카드·상세 시트·지도 오버레이가 공유하는 단일 파생이다.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 mission-view.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 *
 * 세 소비처가 각자 도형·진행도·상태를 다시 계산하면 같은 미션이 카드에서는 완료,
 * 지도에서는 미완으로 보이는 어긋남이 난다 — 한 번 만들어 내려보낸다.
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
    // 사용자가 `&#x27;`를 읽는다 (D7)
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
 * 코스 표시 모델 — 방문 격자 집합은 **미션 상세의 스팟 통계**에서 온다 (E10).
 * 상세를 열기 전(목록)에는 빈 집합이라 스팟 행 자체가 안 보이므로 표시에 영향이 없다.
 */
export const toCourseView = (
  dto: MissionResponseDto,
  progressDto: MissionProgressResponseDto | undefined,
  visitedGridIds: ReadonlySet<string>,
  now: Date,
): CourseView => {
  const view = toMissionView(dto, progressDto, now);
  const spots = courseSpots(view.shape.spots, visitedGridIds);
  // 라인이 없으면 스팟 번호 순 직선으로 잇는다 (E14)
  const path = coursePath(view.shape.line, spots);

  return { ...view, path, spots, loop: isLoopCourse(path) };
};
