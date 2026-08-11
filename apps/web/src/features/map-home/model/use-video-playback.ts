import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getPlaybackOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 영상 재생 조회 (격자 상세 재생 배선 — MSG-329 후속) — `GET /api/videos/{videoId}`.
 * READY면 playbackUrl(블러본 presigned GET)이 오고, 처리 전·FAILED면 null이다 —
 * 표시 분기는 재생 모달이 맡는다. videoId가 null이면(모달 닫힘) 조회하지 않는다.
 * presign TTL(expiresInSec)이 있어 캐시를 신뢰하지 않고 매 열림마다 신선 조회한다.
 */
export const useVideoPlayback = (videoId: number | null) =>
  useQuery({
    ...getPlaybackOptions({ path: { videoId: videoId ?? -1 } }),
    select: unwrapEnvelope,
    enabled: videoId !== null,
    // presigned URL은 TTL이 짧다 — 모달을 다시 열면 만료 주소 재사용 대신 재조회
    staleTime: 0,
    gcTime: 0,
  });

/**
 * 재생 불가 사유 문구 (playbackUrl null 분기) — "처리 중"으로 뭉뚱그리지 않는다:
 * FAILED는 기다려도 재생되지 않고(재업로드 필요), 소유자 BLINDED도 별도 사유다.
 * 서버 계약: READY 아님·BLINDED(소유자)면 playbackUrl null (GetPlayback 명세).
 */
export const playbackUnavailableMessage = (video: {
  processingStatus: string;
  status: string;
}): string => {
  if (video.status === "BLINDED") {
    return "블라인드 처리된 영상이라 재생할 수 없어요";
  }
  if (video.processingStatus === "FAILED") {
    return "영상 처리에 실패했어요. 다시 업로드가 필요해요";
  }
  return "AI가 아직 처리 중인 영상이에요. 처리가 끝나면 재생할 수 있어요";
};
