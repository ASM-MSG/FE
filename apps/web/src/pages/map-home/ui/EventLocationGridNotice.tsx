import { eventLocationGridNotice } from "@/features/event/model/event-location";

interface EventLocationGridNoticeProps {
  gridCount: number;
}

/**
 * 격자 안내 배너 (MSG-518 AC 4) — Figma 15518:6364의 연블루 배너.
 * 확정 결정 2: 1행("이 위치의 행사 격자 N개")만 싣는다 — 시안의 2행(격자별 필터
 * 안내)은 서버 계약("어느 격자로 들어와도 같은 피드")과 모순이라 의도적으로 제외.
 */
export const EventLocationGridNotice = ({
  gridCount,
}: EventLocationGridNoticeProps) => (
  <p className="rounded-sm bg-event-tint px-md py-sm text-fm-body-strong text-primary">
    {eventLocationGridNotice(gridCount)}
  </p>
);
