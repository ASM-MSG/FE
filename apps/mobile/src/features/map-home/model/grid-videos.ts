import type {
  GridGlobalVideoResponseDto,
  GridVideoResponseDto,
} from "../../../shared/api/sdk";
import { formatMonthDay, formatRelativeTime } from "../../../shared/format";

/**
 * 격자·미션 영상 피드 항목 매핑·병합 (MSG-427 B7·C10·D11) — 웹
 * `features/map-home/model/grid-videos.ts`의 복제본.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 grid-videos.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 *
 * 서버 DTO 2종은 화면 계약과 결이 다르다: 전역(GridGlobalVideoResponseDto)은 READY만
 * 담겨 thumbnailUrl이 non-null이고, 내 영상(GridVideoResponseDto)은 viewCount·recordedAt이
 * 없고(createdAt만) non-READY의 thumbnailUrl null이 온다 — 뷰가 DTO 종별을 모르게
 * 여기서 `FeedVideo` 하나로 정규화한다.
 *
 * 웹의 목 전용 잔여 필드(`videoSrc`·`title`·`uploaderHandle`의 목 경로)는 옮기지 않는다 —
 * 모바일에는 목 피드가 없다(F1).
 */
export interface FeedVideo {
  videoId: number;
  /** 썸네일 presigned URL — 내 영상 non-READY면 null (Thumbnail 폴백 분기) */
  thumbnailUrl: string | null;
  durationSec: number;
  /** 조회수 — 내 영상 목록 DTO에 부재라 null (표시 생략) */
  viewCount: number | null;
  /** 표시 시각 — 전역은 recordedAt, 내 영상은 createdAt 근사 */
  recordedAt: string;
  /** 업로더 핸들 표시 문자열("@nickname") — 전역 목록만 보유 */
  uploaderHandle?: string;
  /** 처리 상태 (UPLOADED/ENCODING/BLURRING/READY/FAILED) — 내 영상 목록만 보유 */
  processingStatus?: string;
}

/** 병합 피드 항목 — 소유 구분(mine)이 카드 메타 문구의 근거다 */
export interface GridFeedItem extends FeedVideo {
  mine: boolean;
}

/** 전역 목록 항목 → 피드 항목 — @는 FE가 붙인다(명세 주석 계약) */
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

/** 내 영상 항목 → 피드 항목 — viewCount·recordedAt 부재는 null·createdAt으로 근사 */
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
 * 병합 규칙 — 내 영상이 앞, 전역에서 같은 videoId는 제거.
 * 전역 목록의 내 영상 포함 여부가 명세에 없어 FE 방어다 — 포함 안 되면 무해한 no-op.
 */
export const mergeFeedItems = (
  mine: GridFeedItem[],
  global: GridFeedItem[],
): GridFeedItem[] => {
  const mineIds = new Set(mine.map((item) => item.videoId));
  return [...mine, ...global.filter((item) => !mineIds.has(item.videoId))];
};

/**
 * 소유 메타 평문 라벨 — 카드 둘째 줄(`@닉네임 · 3시간 전` / `내 영상 · 8월 11일`).
 * 서버에 영상 제목이 없어 카드가 전부 같은 이름으로 겹치는 문제의 구분자다.
 */
export const videoOwnerLabel = (video: FeedVideo, mine: boolean): string =>
  mine
    ? `내 영상 · ${formatMonthDay(video.recordedAt)}`
    : [video.uploaderHandle, formatRelativeTime(video.recordedAt)]
        .filter(Boolean)
        .join(" · ");
