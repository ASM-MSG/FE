import { formatDuration, formatRelativeTime } from "../../../shared/format";

/**
 * 영상 더보기(⋯) 메뉴 도메인 로직 (MSG-431 L1~L4) — 웹
 * `apps/web/src/features/video-actions/model/video-menu.ts` 포팅분. 순수 함수/상수라
 * 플랫폼 API(RN·라우터·네트워크)를 참조하지 않는다. 동등성은 `video-menu.parity.test.ts`가
 * 웹 원본을 동적 import해 고정한다 — 웹이 바뀌면 그 테스트가 깨져 드리프트를 알린다.
 *
 * 서버 visibility는 PUBLIC·PRIVATE·FRIENDS 3종이지만 친구 기능이 앱 화면에 없어
 * 시트는 2종만 노출한다 — FRIENDS 상태 영상은 어느 행에도 ✓가 없다.
 *
 * 웹의 `toPlaybackFeedVideo`는 포팅하지 않았다 — 웹 `features/map-home`의 `FeedVideo`
 * 계약(미니 패널 재생)에 결합돼 있고, 모바일은 videoId로 playback을 직접 조회한다.
 */

/** 시트 공개 범위 옵션 — Figma 14856:510 표기 순서 그대로 */
export const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "전체 공개" },
  { value: "PRIVATE", label: "나만 보기" },
] as const;

/** 시트가 전환할 수 있는 공개 범위 유니온 */
export type VideoVisibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

/**
 * 시트·삭제 확인 다이얼로그가 다루는 대상 영상 — 진입점(도감 갤러리 카드·격자 상세 행)이
 * 가진 목록 데이터의 교집합. 목록 응답에 없는 값(visibility)은 단건 조회(getPlayback)로
 * 보강한다 (스펙 Q1 승인 (a)).
 */
export interface VideoActionTarget {
  videoId: number;
  /** 삭제 후 격자 쿼리 무효화 대상 */
  gridId: string;
  thumbnailUrl: string | null;
  durationSec: number;
  /** 수집(업로드) 시각 — 삭제 확인 카드 "N일 전 수집" */
  createdAt: string;
  /** 삭제 확인 카드 제목의 격자 라벨 — 미확보면 null(길이만 표시) */
  gridLabel: string | null;
}

/** 공개 범위 표시 문구 — FRIENDS·미확보는 null(표시 생략) */
export const visibilityLabel = (visibility: string | null): string | null =>
  VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? null;

/**
 * 공개 범위 전환 발사 판정 — 현재값과 같으면 요청 없이 시트만 닫는다.
 * 미확보(null)·FRIENDS에서의 선택은 발사한다 — 서버가 멱등이라 무해.
 */
export const shouldPatchVisibility = (
  current: string | null,
  next: VideoVisibility,
): boolean => current !== next;

/**
 * 삭제 확인 카드의 격자 라벨 — "서면 A-02" (zoneName·zoneCell은 명세상 항상 쌍),
 * 구역 밖이면 행정동 이름 폴백, 둘 다 없으면 null(생략).
 */
export const videoCardLabel = (
  zoneName: string | null,
  zoneCell: string | null,
  regionName: string | null,
): string | null =>
  zoneName !== null && zoneCell !== null
    ? `${zoneName} ${zoneCell}`
    : regionName;

/** 삭제 확인 카드 1행 — "서면 A-02 · 1:24" (라벨 미확보 시 길이만) */
export const deleteCardTitle = (
  label: string | null,
  durationSec: number,
): string => {
  const duration = formatDuration(durationSec) ?? "";
  return label !== null ? `${label} · ${duration}` : duration;
};

/** 삭제 확인 카드 2행 — "3일 전 수집 · 전체 공개" (공개 범위 미확보 시 뒤 절 생략) */
export const deleteCardMeta = (
  createdAt: string,
  visibility: string | null,
  now?: Date,
): string => {
  const collected = `${formatRelativeTime(createdAt, now)} 수집`;
  const label = visibilityLabel(visibility);
  return label !== null ? `${collected} · ${label}` : collected;
};
