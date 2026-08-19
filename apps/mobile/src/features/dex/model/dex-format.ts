import { formatRelativeTime } from "../../../shared/format";

/**
 * 개인 도감 표시 포맷 (MSG-425 L11·L12) — 구 `collection-format.ts`를 개편해 승계한다.
 * 순수 함수 — RN·플랫폼 API에 의존하지 않는다. 모바일 고유 문구라 웹 parity 대상이 아니다.
 *
 * 승계: `formatVideoCount`("영상 N개"), `formatBadgeCount` → `formatCountTile`("N개").
 * 폐기: `formatCollectionRate`(진행 바가 라벨/퍼센트 2슬롯 구조라 형태 불일치 →
 * `region-label.formatProgressRate`가 대체), `formatStreak`(🔥는 Figma 정본에 없음 →
 * `formatStreakTile`, 추정 A6), `formatVisitSummary`(VisitRecord mock 전용).
 */

/** 영상 수 — "영상 12개" */
export const formatVideoCount = (videoCount: number): string =>
  `영상 ${videoCount}개`;

/**
 * 격자 섹션 헤더 우측 영상 수 — "영상 4개". [L12]
 * 동 행 메타와 표기가 같아 `formatVideoCount`에 위임한다(같은 문구를 두 번 정의하지 않는다).
 */
export const formatGroupVideoCount = formatVideoCount;

/** 개수 통계 타일 값 — "6개" (수집 격자·획득 뱃지 공용, 구 formatBadgeCount 승계) */
export const formatCountTile = (count: number): string => `${count}개`;

/** 연속 스트릭 타일 값 — "12일" (Figma 정본에 🔥 없음 — 추정 A6) */
export const formatStreakTile = (days: number): string => `${days}일`;

/** 동 행 보조 문구 — "2시간 전 · 영상 4개". [L11] */
export const formatRecentRegionMeta = (
  lastUploadedAt: string,
  videoCount: number,
  now?: Date,
): string =>
  `${formatRelativeTime(lastUploadedAt, now)} · ${formatVideoCount(videoCount)}`;

/** 갤러리 요약 줄 — "부전2동 · 격자 6개 · 영상 11개". [L12] */
export const formatGallerySummary = (
  regionLabel: string,
  gridCount: number,
  videoCount: number,
): string =>
  `${regionLabel} · 격자 ${gridCount}개 · ${formatVideoCount(videoCount)}`;

/** 영상 카드 수집 시점 — "{상대시간} 수집"(예: "1일 전 수집"). [L12] */
export const formatCollectedAt = (createdAt: string, now?: Date): string =>
  `${formatRelativeTime(createdAt, now)} 수집`;

/** 영상 카드 수집 순번 칩 — "#4" (그룹 내 최신이 큰 번호). [L12] */
export const formatSeqLabel = (seq: number): string => `#${seq}`;
