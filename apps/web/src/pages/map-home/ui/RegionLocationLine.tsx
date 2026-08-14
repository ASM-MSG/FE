import { MapPin } from "lucide-react";

interface RegionLocationLineProps {
  /** 행정동 표시명 */
  regionName: string;
}

/**
 * 패널 하단 위치 줄 (MSG-395) — 핀 아이콘 + 행정동명.
 * 격자 상세와 핫구역 동 요약이 같은 줄을 쓴다 (중복 검출 — 두 번째 사용처 규칙).
 * 행정동이 없으면(무귀속·미판정) 호출부가 렌더하지 않는다 — 빈 핀만 남기지 않기 위해서다.
 */
export const RegionLocationLine = ({ regionName }: RegionLocationLineProps) => (
  <section className="border-t border-border pt-md">
    <p className="flex items-center gap-xs text-fm-caption text-foreground">
      <MapPin aria-hidden className="size-4 shrink-0 text-foreground-muted" />
      {regionName}
    </p>
  </section>
);
