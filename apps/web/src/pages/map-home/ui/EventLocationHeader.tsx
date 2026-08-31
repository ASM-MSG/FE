import { Button } from "@fillmap/ui-web";
import {
  eventLocationMetaLine,
  eventLocationTypeLabel,
  type EventLocationSelection,
} from "@/features/event/model/event-location";

interface EventLocationHeaderProps {
  location: EventLocationSelection;
  /**
   * 업로드 버튼 색 — 영상 목록(6364)은 블루 채움, 빈 상태(6612)는 흰 배경이다.
   * 빈 상태에서는 전폭 "첫 영상 올리기"가 유일한 primary가 되게 한다 (Figma 정본 대비)
   */
  uploadVariant: "primary" | "secondary";
}

/**
 * 위치 선택 상태의 본문 상단 헤더 블록 (MSG-518 AC 3) — Figma 15518:6364.
 * 유형 라벨(한글 변환) · 위치명 · "+ 영상 올리기" 버튼 · 메타 "영상 N · 운영시간"
 * (operatingHours null이면 시간 토막 생략). 전부 선택 스냅숏 바인딩 — 하드코딩 금지.
 * 업로드 버튼은 렌더만(no-op) — MSG-521 확장점: 행사 영상 업로드(upload1) 연결이
 * onClick을 얹는다 (추정 3).
 */
export const EventLocationHeader = ({
  location,
  uploadVariant,
}: EventLocationHeaderProps) => (
  <header className="flex flex-col gap-xxs">
    <div className="flex items-start justify-between gap-sm">
      <div className="min-w-0">
        <p className="text-fm-label text-primary">
          {eventLocationTypeLabel(location.type)}
        </p>
        <h3 className="truncate text-fm-heading font-bold text-foreground">
          {location.name}
        </h3>
      </div>
      <Button
        text="+ 영상 올리기"
        variant={uploadVariant}
        size="sm"
        className="shrink-0"
      />
    </div>
    <p className="text-fm-body text-foreground-muted">
      {eventLocationMetaLine(location)}
    </p>
  </header>
);
