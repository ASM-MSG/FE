import type {
  GridGlobalVideoResponseDto,
  GridVideoResponseDto,
} from "@/shared/api/generated";
import { formatMonthDay, formatRelativeTime } from "@/shared/format";

/**
 * 격자 영상 피드 항목 매핑·병합 (MSG-326 기준 1~3).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 서버 DTO 2종은 화면 계약과 결이 다르다: 전역(GridGlobalVideoResponseDto)은 READY만
 * 담겨 thumbnailUrl이 non-null이고, 내 영상(GridVideoResponseDto)은 viewCount·recordedAt이
 * 없고(createdAt만) non-READY의 thumbnailUrl null이 온다 — 뷰가 DTO 종별을 모르게
 * 여기서 `FeedVideo` 하나로 정규화한다.
 */

/**
 * 피드 영상 뷰 인터페이스 — FeedVideoCard·VideoMiniPanel·video-mini-panel-store의 공통 계약.
 * 기존 `CellVideo`(목 — 테마 피드 경로)가 **구조적으로 할당 가능**하게 설계됐다:
 * thumbnailUrl·viewCount는 null 허용으로 완화, 목 전용(title·uploaderHandle·videoSrc)과
 * 실 API 전용(processingStatus)은 선택 필드다.
 */
export interface FeedVideo {
  videoId: number;
  /** 썸네일 presigned URL — 내 영상 non-READY면 null (기준 11 placeholder 분기) */
  thumbnailUrl: string | null;
  durationSec: number;
  /** 조회수 — 내 영상 목록 DTO에 부재라 null (표시 생략, 추정 3) */
  viewCount: number | null;
  /** 표시 시각 — 전역은 recordedAt, 내 영상은 createdAt 근사 (추정 3) */
  recordedAt: string;
  /** 영상 제목 — 서버 전체 부재(기존 리스크), 목(CellVideo) 경로만 보유 */
  title?: string;
  /** 업로더 핸들 표시 문자열("@nickname") — 전역 목록만 보유 */
  uploaderHandle?: string;
  /**
   * 목 재생 소스 — 테마 피드 과도기 전용 (추정 8). 보유 시 재생 쿼리를 생략한다 —
   * 테마 피드 실전환 티켓에서 videoSrc 분기와 함께 제거된다.
   */
  videoSrc?: string;
  /** 처리 상태 (UPLOADED/ENCODING/BLURRING/READY/FAILED) — 내 영상 목록만 보유 */
  processingStatus?: string;
}

/** 병합 피드 항목 — 소유 구분(mine)이 카드 메타 문구·미니 패널 분기의 근거다 */
export interface GridFeedItem extends FeedVideo {
  mine: boolean;
}

/** 전역 목록 항목 → 피드 항목 (기준 1) — @는 FE가 붙인다(명세 주석 계약) */
export const toFeedItemFromGlobal = (
  dto: GridGlobalVideoResponseDto,
): GridFeedItem => ({
  videoId: dto.videoId,
  thumbnailUrl: dto.thumbnailUrl,
  durationSec: dto.durationSec,
  viewCount: dto.viewCount,
  recordedAt: dto.recordedAt,
  uploaderHandle: `@${dto.nickname}`,
  mine: false,
});

/** 내 영상 항목 → 피드 항목 (기준 2) — viewCount·recordedAt 부재는 null·createdAt으로 근사 */
export const toFeedItemFromMine = (
  dto: GridVideoResponseDto,
): GridFeedItem => ({
  videoId: dto.videoId,
  thumbnailUrl: dto.thumbnailUrl,
  durationSec: dto.durationSec,
  viewCount: null,
  recordedAt: dto.createdAt,
  processingStatus: dto.processingStatus,
  mine: true,
});

/**
 * 병합 규칙 (기준 3) — 내 영상이 앞(MSG-277 정렬 관례), 전역에서 같은 videoId는 제거.
 * 전역 목록의 내 영상 포함 여부가 명세에 없어 FE 방어다 — 포함 안 되면 무해한 no-op (리스크 2).
 */
export const mergeFeedItems = (
  mine: GridFeedItem[],
  global: GridFeedItem[],
): GridFeedItem[] => {
  const mineIds = new Set(mine.map((item) => item.videoId));
  return [...mine, ...global.filter((item) => !mineIds.has(item.videoId))];
};

/**
 * 소유 메타 평문 라벨 — 화면 표기(VideoOwnerMeta)와 같은 분기·포맷의 문자열판.
 * 서버에 영상 제목이 없어 카드 접근성 이름이 전부 "영상 재생"으로 겹치는 문제의
 * 구분자다 (PR #51 리뷰 반영). 표기 분기를 바꾸면 VideoOwnerMeta와 함께 갱신한다.
 */
export const videoOwnerLabel = (video: FeedVideo, mine: boolean): string =>
  mine
    ? `내 영상 · ${formatMonthDay(video.recordedAt)}`
    : [video.uploaderHandle, formatRelativeTime(video.recordedAt)]
        .filter(Boolean)
        .join(" · ");
