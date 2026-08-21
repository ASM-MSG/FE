import { BlurScreen } from "../../features/upload/ui/blur-screen";

/**
 * AI 자동 블러 확인 라우트 (MSG-429) — **알림 진입 전용**이다.
 * 위저드(`/upload → analyzing → highlight → preview`)는 이 경로를 거치지 않는다.
 * 진입 계약: `/upload/blur?videoId={id}` (완료 통지 [확인하기] · 블러 완료 푸시 탭).
 * 경로를 `/upload` 밑에 남긴 것은 승인 D3 — 도메인이 여전히 업로드 후처리다.
 */
export default function UploadBlur() {
  return <BlurScreen />;
}
