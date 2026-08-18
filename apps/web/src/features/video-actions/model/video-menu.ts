import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import { formatDuration, formatRelativeTime } from "@/shared/format";

/**
 * 영상 더보기(⋯) 메뉴 도메인 로직 (MSG-411 AC 1~3, 추정 3·5·7) — 순수 함수/상수.
 * 플랫폼 API(window·fetch 등)를 참조하지 않는다 — RN 재사용 대상.
 * 서버 visibility는 PUBLIC·PRIVATE·FRIENDS 3종이지만 친구 기능이 웹에 없어
 * 메뉴는 2종만 노출한다(추정 3) — FRIENDS 상태 영상은 어느 옵션에도 ✓가 없다.
 */

/** 더보기 메뉴 공개 범위 옵션 — Figma 14791:3689 표기 순서 그대로 */
export const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "전체 공개" },
  { value: "PRIVATE", label: "나만 보기" },
] as const;

/** 메뉴가 전환할 수 있는 공개 범위 유니온 */
export type VideoVisibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

/**
 * 더보기 메뉴·삭제 확인 모달이 다루는 대상 영상 — 진입점(도감 갤러리 카드·미니 패널)이
 * 가진 목록 데이터의 교집합. 목록 응답에 없는 값(visibility·구역 밖 폴백 라벨)은
 * 단건 재생 조회(getPlayback)로 보강한다 (스펙 코드 대조 — 목록 응답에 visibility 없음).
 */
export interface VideoActionTarget {
  videoId: number;
  /** 격자 쿼리 무효화 대상 — 미확보(미니 패널 초기 등)면 null, playback으로 보강 */
  gridId: string | null;
  thumbnailUrl: string | null;
  durationSec: number;
  /** 수집(업로드) 시각 — 삭제 확인 카드 "N일 전 수집" */
  createdAt: string;
  zoneName: string | null;
  zoneCell: string | null;
}

/** 공개 범위 표시 문구 — FRIENDS·미확보는 null(표시 생략, 추정 3·7) */
export const visibilityLabel = (visibility: string | null): string | null =>
  VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? null;

/**
 * 공개 범위 전환 발사 판정 (추정 5) — 현재값과 같으면 요청 없이 메뉴만 닫는다.
 * 미확보(null)·FRIENDS에서의 선택은 발사한다 — 서버가 멱등이라 무해.
 */
export const shouldPatchVisibility = (
  current: string | null,
  next: VideoVisibility,
): boolean => current !== next;

/**
 * 삭제 확인 카드의 격자 라벨 — "서면 A-02" (zoneName·zoneCell은 명세상 항상 쌍),
 * 구역 밖이면 행정동 이름 폴백, 둘 다 없으면 null(생략) — VideoMiniPanel 라벨 관례 준용.
 */
export const videoCardLabel = (
  zoneName: string | null,
  zoneCell: string | null,
  regionName: string | null,
): string | null =>
  zoneName !== null && zoneCell !== null
    ? `${zoneName} ${zoneCell}`
    : regionName;

/** 삭제 확인 카드 1행 — "서면 A-02 · 1:24" (라벨 미확보 시 길이만, Figma 14792:3610) */
export const deleteCardTitle = (
  label: string | null,
  durationSec: number,
): string => {
  const duration = formatDuration(durationSec) ?? "";
  return label !== null ? `${label} · ${duration}` : duration;
};

/** 삭제 확인 카드 2행 — "3일 전 수집 · 전체 공개" (공개 범위 미확보 시 뒤 절 생략, 추정 7) */
export const deleteCardMeta = (
  createdAt: string,
  visibility: string | null,
  now?: Date,
): string => {
  const collected = `${formatRelativeTime(createdAt, now)} 수집`;
  const label = visibilityLabel(visibility);
  return label !== null ? `${collected} · ${label}` : collected;
};

/**
 * 단건 재생 조회용 FeedVideo 변환 — useVideoPlaybackQuery(map-home)의 입력 계약.
 * videoSrc를 두지 않아(목 경로 아님) 조회가 활성화된다.
 */
export const toPlaybackFeedVideo = (target: VideoActionTarget): FeedVideo => ({
  videoId: target.videoId,
  thumbnailUrl: target.thumbnailUrl,
  durationSec: target.durationSec,
  viewCount: null,
  recordedAt: target.createdAt,
});
