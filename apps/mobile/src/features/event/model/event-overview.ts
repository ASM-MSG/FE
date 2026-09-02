import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import { kstDateOf } from "./event-chip";
import { eventLocationTypeLabel } from "./event-location";

/**
 * 행사 개요 파생 — 웹 `features/event/model/event-overview.ts` 부분 포팅 (MSG-557 D9).
 * `viewerCountLabel`(시청 인원)과 카드 뷰의 `dto` 슬롯(카드 탭 → 위치 상세)은 1단계 제외
 * 범위라 옮기지 않았다 (D10). 순수 함수.
 */

/** "YYYY-MM-DD" → "M.D" (선행 0 제거) */
const monthDayLabel = (date: string): string => {
  const [, month, day] = date.split("-").map(Number);
  return `${month}.${day}`;
};

/** 행사 기간 라벨 — KST 날짜부 "M.D–M.D" (en dash) */
export const eventPeriodLabel = (startsAt: string, endsAt: string): string =>
  `${monthDayLabel(kstDateOf(startsAt))}–${monthDayLabel(kstDateOf(endsAt))}`;

/** 위치 행 하나의 뷰 재료 — 1단계는 비인터랙티브 (D10) */
export interface EventLocationCardView {
  locationId: number;
  name: string;
  /** "유형 · 운영시간" — operatingHours null이면 유형 라벨만 */
  meta: string;
  /** "영상 N" */
  videoBadge: string;
  /** 커버 이미지 — null이면 Thumbnail 폴백 */
  imageUrl: string | null;
}

/** 위치 목록 → 행 뷰 — 서버 정렬(표시 순서 → id 오름차순)을 그대로 유지한다 */
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
  }));
