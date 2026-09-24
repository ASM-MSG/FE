import type {
  InboxItem,
  InboxPage,
} from "../features/notifications/model/inbox";

/**
 * 알림함 테스트 공용 fixture (MSG-602) — 모델·mutation 테스트가 같은 항목·페이지 봉투를 쓴다.
 * 기본은 대상 없음(MSG-432 이전 알림 형태). 생성 타입이 `targetType`의 null을 잃어(hey-api가
 * enum+null을 non-null로 뽑는다) 서버 실제 값인 null을 단언으로 넣는다 — 소비 쪽은 `unknown`으로 본다.
 */
export const inboxItem = (
  notificationId: number,
  read = false,
  category: InboxItem["category"] = "BADGE",
  target: Pick<InboxItem, "targetType" | "targetId"> = {
    targetType: null as unknown as InboxItem["targetType"],
    targetId: null,
  },
): InboxItem => ({
  notificationId,
  category,
  title: `알림 ${notificationId}`,
  body: "본문",
  createdAt: "2026-09-23T07:00:00",
  read,
  ...target,
});

export const inboxPage = (
  notifications: InboxItem[],
  hasNext = false,
  nextCursor: number | null = null,
): InboxPage => ({
  developCode: 0,
  message: "ok",
  data: { notifications, hasNext, nextCursor },
});
