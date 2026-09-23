import type { InfiniteData } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  infiniteListResult,
  type InfiniteListResult,
  type InfiniteQuerySurface,
} from "../../../shared/api/infinite-list";
import type {
  ApiResponseDtoNotificationPageResponseDto,
  NotificationItemResponseDto,
} from "../../../shared/api/sdk";
import { formatRelativeTime, normalizeUtcIso } from "../../../shared/format";

/**
 * 알림함 순수 파생 (MSG-602 L1~L5) — 커서·평탄화·낙관 읽음 기록·배지 문구.
 * 훅(`api/use-inbox-query`, `api/inbox-mutations`)은 배선만 남긴다.
 * 서버 계약: MSG-434 — id 내림차순 keyset, 커서는 마지막 항목의 notificationId 하나.
 */
export type InboxPage = ApiResponseDtoNotificationPageResponseDto;
export type InboxItem = NotificationItemResponseDto;
export type InboxCategory = InboxItem["category"];
/** useInfiniteQuery 캐시 형태 — pageParam은 첫 페이지 `{}` 또는 커서 number */
export type InboxData = InfiniteData<InboxPage, unknown>;

/** 다음 페이지 커서 — `hasNext=false`면 undefined로 중단 */
export const nextInboxPageParam = (lastPage: InboxPage): number | undefined => {
  const { hasNext, nextCursor } = unwrapEnvelope(lastPage);
  return hasNext ? (nextCursor ?? undefined) : undefined;
};

/** 페이지들을 응답 순서대로 이어붙인 단일 목록 — 정렬·중복 제거 없음(서버 커서 계약 신뢰) */
export const flattenInboxPages = (
  pages: InboxPage[] | undefined,
): InboxItem[] =>
  (pages ?? []).flatMap((page) => unwrapEnvelope(page).notifications);

export type InboxResult = InfiniteListResult<InboxItem>;

export const inboxResult = (
  query: InfiniteQuerySurface<InboxPage>,
): InboxResult => infiniteListResult(query, flattenInboxPages);

const mapItems = (
  data: InboxData | undefined,
  update: (item: InboxItem) => InboxItem,
): InboxData | undefined =>
  data === undefined
    ? undefined
    : {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          data: {
            ...page.data,
            notifications: page.data.notifications.map(update),
          },
        })),
      };

/** 낙관 읽음 기록 (L4) — 해당 id만 read=true, 새 객체를 돌려주고 원본은 건드리지 않는다 */
export const markReadInPages = (
  data: InboxData | undefined,
  notificationId: number,
): InboxData | undefined =>
  mapItems(data, (item) =>
    item.notificationId === notificationId && !item.read
      ? { ...item, read: true }
      : item,
  );

export const markAllReadInPages = (
  data: InboxData | undefined,
): InboxData | undefined =>
  mapItems(data, (item) => (item.read ? item : { ...item, read: true }));

/** 캐시에서 그 알림이 아직 안읽음인지 — 배지 감산 여부의 근거 */
export const isUnreadInPages = (
  data: InboxData | undefined,
  notificationId: number,
): boolean =>
  flattenInboxPages(data?.pages).some(
    (item) => item.notificationId === notificationId && !item.read,
  );

export const hasUnread = (count: number | undefined): boolean =>
  (count ?? 0) > 0;

/** 프로필 행·요약 행 문구 (L5) — 0이거나 미도착이면 문구 없음(PRD FR-6: 0이면 숨긴다) */
export const unreadHint = (count: number | undefined): string | undefined =>
  hasUnread(count) ? `새 알림 ${count}개` : undefined;

export const decrementUnread = (count: number): number =>
  Math.max(0, count - 1);

/** 행의 시각 — 서버 createdAt은 타임존 마커 없는 UTC라 보정 후 상대 시간 */
export const formatInboxTime = (createdAt: string, now?: Date): string =>
  formatRelativeTime(normalizeUtcIso(createdAt), now);
