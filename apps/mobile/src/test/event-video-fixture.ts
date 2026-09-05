import type {
  EventVideoCommentResponseDto,
  EventVideoDetailResponseDto,
} from "../shared/api/sdk";

/**
 * 테스트 전용 픽스처 — 행사 영상 상세 (MSG-562). 웹 `src/test/event-video-fixture.ts`의
 * 형상에 서버 실응답(2026-09-03, `GET /api/event-videos/240347`)의 값을 실었다.
 * parity·캐시·뮤테이션 테스트가 같은 모양을 공유한다.
 */
export const eventComment = (
  commentId: number,
  over: Partial<EventVideoCommentResponseDto> = {},
): EventVideoCommentResponseDto => ({
  commentId,
  authorId: 7,
  authorNickname: "강정만두",
  content: `현장 분위기 최고 ${commentId}`,
  createdAt: "2026-09-01T01:40:00Z",
  ...over,
});

export const EVENT_VIDEO_DETAIL: EventVideoDetailResponseDto = {
  videoId: 240347,
  occurrenceId: 5,
  occurrenceStatus: "LIVE",
  locationId: 11,
  locationName: "서면 목데이터 포토존",
  representativeGridId: "16858_11420",
  zoneName: "전포",
  zoneCell: "I-2",
  regionName: "부산광역시 부산진구 전포1동",
  playbackUrl: "https://cdn.example.com/event-240347.mp4",
  durationSec: 5,
  recordedAt: "2026-09-01T01:39:10Z",
  createdAt: "2026-09-01T01:39:12Z",
  uploaderNickname: "강정만두",
  interactionLocked: false,
  helpfulCount: 1,
  helpfulByMe: false,
  commentCount: 2,
  comments: {
    comments: [eventComment(1), eventComment(2)],
    hasNext: false,
    nextCursor: null,
  },
};
