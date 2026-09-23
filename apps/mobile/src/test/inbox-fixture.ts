import type {
  InboxItem,
  InboxPage,
} from "../features/notifications/model/inbox";

/** 알림함 테스트 공용 fixture (MSG-602) — 모델·mutation 테스트가 같은 항목·페이지 봉투를 쓴다 */
export const inboxItem = (
  notificationId: number,
  read = false,
  category: InboxItem["category"] = "BADGE",
): InboxItem => ({
  notificationId,
  category,
  title: `알림 ${notificationId}`,
  body: "본문",
  createdAt: "2026-09-23T07:00:00",
  read,
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
