import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";
import { kstDateOf } from "./event-chip";
// 유형 라벨은 MSG-518의 event-location과 공유 — merge에서 exact 중복 발견·단일화
import { eventLocationTypeLabel } from "./event-location";

/**
 * 행사 위치 개요 파생 (MSG-517 AC 1·3·4·9) — 기간·시청 인원·위치 카드 뷰.
 * 순수 함수 — 플랫폼 무의존, RN 재사용 대상.
 */

/** "YYYY-MM-DD" → "M.D" (선행 0 제거 — Figma 정본 "7.17") */
const monthDayLabel = (date: string): string => {
  const [, month, day] = date.split("-").map(Number);
  return `${month}.${day}`;
};

/** 행사 기간 라벨 (AC 1) — KST 날짜부 "M.D–M.D" (Figma 15518:5929 "7.17–8.9") */
export const eventPeriodLabel = (startsAt: string, endsAt: string): string =>
  `${monthDayLabel(kstDateOf(startsAt))}–${monthDayLabel(kstDateOf(endsAt))}`;

/**
 * 시청 인원 라벨 (AC 3·4, 추정 5) — 0은 "0명 보는 중"(아무도 없음도 정보),
 * null(캐시 장애·조회 실패)은 라벨 없음(표시만 생략).
 */
export const viewerCountLabel = (viewerCount: number | null): string | null =>
  viewerCount === null ? null : `${viewerCount}명 보는 중`;

/** 위치 카드 하나의 뷰 재료 (AC 9) — 클릭은 선택 스냅숏으로 이어진다 (MSG-534) */
export interface EventLocationCardView {
  locationId: number;
  name: string;
  /** "유형 · 운영시간" — operatingHours null이면 유형 라벨만 (AC 9) */
  meta: string;
  /** "영상 N" 배지 라벨 (AC 9) */
  videoBadge: string;
  /** 커버 이미지 — null이면 Thumbnail 폴백 (AC 9) */
  imageUrl: string | null;
  /**
   * 클릭 배선용 원본 DTO (MSG-534) — 카드 선택은 `toEventLocationSelection(dto)`가
   * 스냅숏을 만든다. 뷰 파생 한 곳에서 짝을 보장해 화면이 id로 목록을 되짚지 않는다.
   */
  dto: EventLocationResponseDto;
}

/** 위치 목록 → 카드 뷰 (AC 9) — 서버 정렬(표시 순서 → id 오름차순)을 그대로 유지한다 */
export const toLocationCardViews = (
  locations: EventLocationResponseDto[],
): EventLocationCardView[] =>
  locations.map((loc) => ({
    locationId: loc.locationId,
    name: loc.name,
    meta:
      loc.operatingHours === null
        ? eventLocationTypeLabel(loc.type)
        : `${eventLocationTypeLabel(loc.type)} · ${loc.operatingHours}`,
    videoBadge: `영상 ${loc.videoCount}`,
    imageUrl: loc.imageUrl,
    dto: loc,
  }));
