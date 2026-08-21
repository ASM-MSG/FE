import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getPlaybackOptions } from "../../../shared/api/query-options";

/**
 * 블러 확인 화면의 영상 조회 (MSG-429 기준 1·2) — `GET /api/videos/{videoId}`.
 *
 * 확인 화면이 업로드 플로우 스토어를 못 쓰는 이유: 알림 진입 시점에는 확정 성공 정산
 * (`settleUploadSuccess`)이 이미 스토어를 `reset()`했고, 푸시 콜드 스타트라면 애초에
 * 아무것도 복원되지 않는다. **재생 소스의 정본은 서버가 준 `playbackUrl`**(블러 처리본)이며,
 * 종전 화면이 재생하던 로컬 원본과 달리 실제로 블러가 입혀진 파일이다.
 *
 * videoId가 null(파라미터 불량)이면 쿼리를 켜지 않는다 — 화면이 안내로 종결한다.
 */
export const useBlurPlaybackQuery = (videoId: number | null) =>
  useQuery({
    ...getPlaybackOptions({ path: { videoId: videoId ?? 0 } }),
    enabled: videoId !== null,
    select: unwrapEnvelope,
  });
