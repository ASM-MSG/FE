import type { EventLocationResponseDto } from "../../../shared/api/sdk";

/**
 * 행사 위치 재료 — 웹 `features/event/model/event-location.ts` 포팅 (MSG-557 D9 · MSG-560 D4).
 * 유형 라벨은 1단계, 선택 스냅숏·메타 줄·격자 안내·섹션 제목은 2단계(위치 상세)에서 옮겼다.
 * 전부 순수 함수 — 동등성은 event-location.parity.test.ts가 웹 원본을 동적 import해 고정한다.
 */
export type EventLocationType = EventLocationResponseDto["type"];

/**
 * 선택된 행사 위치 스냅숏 (D1) — 위치 목록 조회는 `use-event-room-query` 소유라
 * 선택 시점 DTO 스냅숏만 선택 상태에 담는다 (videoCount는 선택 시점 값 — 업로드 직후
 * 정합은 확정 무효화(D12) 몫).
 */
export interface EventLocationSelection {
  locationId: number;
  name: string;
  type: EventLocationType;
  operatingHours: string | null;
  /** 위치 영역 격자 수 — 격자 안내 1행 재료 */
  gridCount: number;
  videoCount: number;
}

/** 위치 DTO → 선택 스냅숏 (D1) — 위치 행 탭·지도 셀 탭이 공용한다 */
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

/**
 * 선택 스냅숏을 최신 위치 DTO로 갱신 (codex 리뷰 P2) — 스냅숏은 탭 시점 값이라 업로드·재조회로
 * `videoCount`가 바뀌어도 열린 상세 시트가 옛 값을 보인다. 목록에 없으면(재조회 전) 스냅숏 유지.
 */
export const refreshEventLocationSelection = (
  selected: EventLocationSelection,
  locations: readonly EventLocationResponseDto[],
): EventLocationSelection => {
  const dto = locations.find((item) => item.locationId === selected.locationId);
  return dto === undefined ? selected : toEventLocationSelection(dto);
};

/** 위치 유형 한글 라벨 — 서버 명세 "표시 라벨 변환은 FE 몫" */
const TYPE_LABELS: Record<EventLocationType, string> = {
  POPUP: "팝업",
  EXPERIENCE_ZONE: "체험존",
  PARADE: "퍼레이드",
  PHOTO_ZONE: "포토존",
  ETC: "기타",
};

export const eventLocationTypeLabel = (type: EventLocationType): string =>
  TYPE_LABELS[type];

/** 위치 시트 메타 줄 `영상 N · 운영시간` (D4) — operatingHours null이면 시간 토막 생략 */
export const eventLocationMetaLine = ({
  videoCount,
  operatingHours,
}: Pick<EventLocationSelection, "videoCount" | "operatingHours">): string =>
  operatingHours === null
    ? `영상 ${videoCount}`
    : `영상 ${videoCount} · ${operatingHours}`;

/**
 * 격자 안내 1행 (D4) — 시안의 2행("격자를 누르면 해당 격자 영상만…")은 서버 계약
 * ("어느 격자로 들어와도 같은 피드")과 모순이라 싣지 않는다 (웹 MSG-518 확정 결정 2).
 */
export const eventLocationGridNotice = (gridCount: number): string =>
  `이 위치의 행사 격자 ${gridCount}개`;

/** 영상 섹션 제목 `{위치명 앞토막} 현장 영상` (D4) — 공백 없는 이름은 전체가 앞토막 */
export const eventLocationSectionTitle = (name: string): string =>
  `${name.trim().split(/\s+/)[0]} 현장 영상`;
