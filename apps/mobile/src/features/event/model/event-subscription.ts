import type { EventOccurrenceDetailResponseDto } from "../../../shared/api/sdk";
import { isArchivedEventStatus } from "./event-status";

/**
 * 행사 알림 구독 순수 파생 (MSG-603). 노출 여부와 값은 서버 상세 응답에서만 읽는다 —
 * `notificationOn`은 "구독 행 존재 AND 예정·진행 중"의 파생값(MSG-442)이라 종료 회차는 항상 false다.
 */
export interface EventSubscriptionView {
  enabled: boolean;
}

/**
 * 토글 행 재료 — 종료 회차(UPLOAD_GRACE·ARCHIVED)는 null(행을 그리지 않는다). 서버가 ON을
 * 409로 거부하고 시작 알림이 이미 지나 받을 것이 없으므로 켤 수 없는 토글을 보이지 않는다.
 */
export const eventSubscriptionView = (
  detail: Pick<
    EventOccurrenceDetailResponseDto,
    "status" | "notificationOn"
  > | null,
): EventSubscriptionView | null =>
  detail === null || isArchivedEventStatus(detail.status)
    ? null
    : { enabled: detail.notificationOn };

/** 낙관·서버 응답 기록 — 상세 봉투의 `notificationOn`만 바꾼 새 객체 */
export const withNotificationOn = <T extends { notificationOn: boolean }>(
  detail: T,
  enabled: boolean,
): T =>
  detail.notificationOn === enabled
    ? detail
    : { ...detail, notificationOn: enabled };

export const EVENT_SUBSCRIPTION_ERROR_TEXT =
  "알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요";
