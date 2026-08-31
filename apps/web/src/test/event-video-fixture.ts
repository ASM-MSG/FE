import type {
  EventVideoCommentResponseDto,
  EventVideoDetailResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 테스트 전용 픽스처 — 행사 영상 상세(MSG-520). 상세 쿼리·뮤테이션·패널 스모크가
 * 같은 모양을 공유한다 (playback-fixture 선례). 부산 서면/광안리 목 관례.
 */
export const eventComment = (
  commentId: number,
  over: Partial<EventVideoCommentResponseDto> = {},
): EventVideoCommentResponseDto => ({
  commentId,
  authorId: commentId * 10,
  authorNickname: `서면러버${commentId}`,
  content: `현장 분위기 최고 ${commentId}`,
  createdAt: "2026-08-31T03:00:00.000Z",
  ...over,
});

export const EVENT_VIDEO_DETAIL: EventVideoDetailResponseDto = {
  videoId: 42,
  occurrenceId: 7,
  occurrenceStatus: "LIVE",
  locationId: 4,
  locationName: "광안리 피카츄 퍼레이드",
  representativeGridId: "39064_112221",
  zoneName: "광안리",
  zoneCell: "H-6",
  regionName: "민락동",
  playbackUrl: "https://cdn.example.com/event-42.mp4",
  durationSec: 24,
  recordedAt: "2026-08-31T02:50:00.000Z",
  createdAt: "2026-08-31T03:00:00.000Z",
  uploaderNickname: "전포골목대장",
  interactionLocked: false,
  helpfulCount: 18,
  helpfulByMe: false,
  commentCount: 2,
  comments: {
    comments: [eventComment(1), eventComment(2)],
    hasNext: false,
    nextCursor: null,
  },
};
