/**
 * 개인 도감 표시 포맷 (MSG-299 AC 2·3) — shared/format.ts의 기존 함수와 중복 없음
 * (formatRelativeTime은 "1일 전" 체계라 "어제" 라벨 표기와 다름 — 스펙 확인).
 * 🔥는 텍스트 이모지 리터럴 (추정 3 — lucide 아이콘 아님).
 */
import type { CollectionSummary, VisitRecord } from "./mock-collection";

/** 수집률 — "부산진구 52%" (AC 2) */
export const formatCollectionRate = (
  summary: Pick<CollectionSummary, "regionName" | "collectionRate">,
): string => `${summary.regionName} ${summary.collectionRate}%`;

/** 현재 스트릭 — "🔥 12일" (AC 2, 추정 3) */
export const formatStreak = (streakDays: number): string =>
  `🔥 ${streakDays}일`;

/** 획득 뱃지 — "23개" (AC 2) */
export const formatBadgeCount = (badgeCount: number): string =>
  `${badgeCount}개`;

/** 방문 요약 — "방문 34회 · 마지막 방문 어제" (AC 3) */
export const formatVisitSummary = (
  record: Pick<VisitRecord, "visitCount" | "lastVisitLabel">,
): string =>
  `방문 ${record.visitCount}회 · 마지막 방문 ${record.lastVisitLabel}`;

/** 영상 수 — "영상 12개" (AC 3) */
export const formatVideoCount = (videoCount: number): string =>
  `영상 ${videoCount}개`;
