import type { VideoPlaybackResponseDto } from "@/shared/api/generated";

/**
 * 단건 재생 조회(GET /api/videos/{videoId}) 응답 픽스처 — READY 기본형.
 * 미니 패널 스모크가 사용한다 (구 use-video-playback 훅 테스트는 MSG-326
 * use-video-playback-query로 통일되며 정리).
 */
export const READY_PLAYBACK: VideoPlaybackResponseDto = {
  videoId: 42,
  nickname: "필맵퍼",
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
