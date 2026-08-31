import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";

/** 행사 위치 유형 — 명세 정본에서 type-only 파생 (entities/event 관례) */
export type EventLocationType = EventLocationResponseDto["type"];

/**
 * 선택된 행사 위치 스냅숏 (MSG-518 AC 1) — 위치 목록 조회는 MSG-517 소유라
 * 이 티켓은 선택 시점 DTO 스냅숏만 스토어에 담는다 (추정 1 — videoCount는
 * 선택 시점 값이라 업로드 직후 스테일일 수 있고, 정합은 MSG-520/521 무효화 몫).
 */
export interface EventLocationSelection {
  locationId: number;
  name: string;
  type: EventLocationType;
  operatingHours: string | null;
  /** 위치 영역 격자 수 — 격자 안내 배너 재료 (AC 4) */
  gridCount: number;
  videoCount: number;
}

/**
 * 위치 DTO → 선택 스냅숏 변환 (AC 1) — MSG-517 위치 목록 행이 클릭 배선 시
 * 1줄로 호출한다 (확정 결정 1). 순수 함수, RN 재사용 대상.
 */
export const toEventLocationSelection = (
  dto: EventLocationResponseDto,
): EventLocationSelection => ({
  locationId: dto.locationId,
  name: dto.name,
  type: dto.type,
  operatingHours: dto.operatingHours,
  gridCount: dto.gridIds.length,
  videoCount: dto.videoCount,
});

/** 위치 유형 한글 라벨 (AC 3) — 서버 명세 "표시 라벨 변환은 FE 몫" */
const TYPE_LABELS: Record<EventLocationType, string> = {
  POPUP: "팝업",
  EXPERIENCE_ZONE: "체험존",
  PARADE: "퍼레이드",
  PHOTO_ZONE: "포토존",
  ETC: "기타",
};

export const eventLocationTypeLabel = (type: EventLocationType): string =>
  TYPE_LABELS[type];

/** 헤더 메타 줄 "영상 N · 운영시간" (AC 3) — operatingHours null이면 시간 토막 생략 */
export const eventLocationMetaLine = ({
  videoCount,
  operatingHours,
}: Pick<EventLocationSelection, "videoCount" | "operatingHours">): string =>
  operatingHours === null
    ? `영상 ${videoCount}`
    : `영상 ${videoCount} · ${operatingHours}`;

/**
 * 격자 안내 1행 문구 (AC 4, 확정 결정 2) — 시안의 2행("격자를 누르면 해당 격자
 * 영상만…")은 서버 계약("어느 격자로 들어와도 같은 피드")과 모순이라 싣지 않는다.
 */
export const eventLocationGridNotice = (gridCount: number): string =>
  `이 위치의 행사 격자 ${gridCount}개`;

/** 영상 섹션 제목 "{위치명 앞토막} 현장 영상" (AC 5) — 공백 없는 이름은 전체가 앞토막 */
export const eventLocationSectionTitle = (name: string): string =>
  `${name.trim().split(/\s+/)[0]} 현장 영상`;
