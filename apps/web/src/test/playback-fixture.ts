import type { VideoPlaybackResponseDto } from "@/shared/api/generated";

/**
 * 단건 재생 조회(GET /api/videos/{videoId}) 응답 픽스처 — READY 기본형.
 * use-video-playback 훅 테스트와 미니 패널 스모크가 공유한다 (중복 게이트 추출).
 */
export const READY_PLAYBACK: VideoPlaybackResponseDto = {
  videoId: 42,
  playbackUrl: "https://cdn.example.com/blurred.mp4",
  thumbnailUrl: null,
  gridId: "16846_11428",
  durationSec: 5,
  processingStatus: "READY",
  visibility: "PUBLIC",
  status: "ACTIVE",
  viewCount: 19,
  recordedAt: "2026-08-02T05:00:00Z",
  expiresInSec: 600,
  zoneName: "서면",
  zoneCell: "F-8",
  regionName: "부산광역시 부산진구 부전1동",
  highlights: null,
};
