import { useLocalSearchParams } from "expo-router";
import { VideoPlayerScreen } from "../../features/video-playback/ui/video-player-screen";

/**
 * 영상 재생 (MSG-446 기준 6·8) — 카드 탭 → Stack **push**. 직전 화면이 마운트된 채
 * 남아 뒤로 갔을 때 목록 스크롤·시트 상태가 그대로 복원된다 (기준 9).
 *
 * `mine`은 목록이 이미 알고 있는 소유 여부를 표기용으로 넘겨받는 것이다 — 재생 응답에
 * 소유 필드가 없다(닉네임만 있다). **접근 판정에는 쓰지 않는다** (기준 12).
 * 딥링크·푸시로 형식 밖 param이 오면 조회를 걸지 않는다 (`/grid/[cellId]` 선례).
 */
export default function VideoPlayback() {
  const { videoId, mine } = useLocalSearchParams<{
    videoId: string;
    mine?: string;
  }>();

  const parsed = Number(videoId);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;

  return <VideoPlayerScreen videoId={parsed} mine={mine === "1"} />;
}
