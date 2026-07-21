import type { BlurRegion } from "@/features/upload/model/blur-detection";

interface BlurOverlayProps {
  /** 표시할 감지 영역(목업) — buildMockBlurRegions 결과 */
  regions: BlurRegion[];
}

/**
 * 감지 영역 오버레이 — 점선 박스 + 파란 라벨. [S9]
 * box는 미리보기 대비 % 좌표(목업, Q3)이므로 위치·크기만 인라인 스타일로 지정하고
 * 색·선 스타일은 토큰 클래스(border-dashed·border-primary·bg-primary/10)로 표현한다.
 * 클릭을 가로채지 않는다(view-only) — pointer-events-none.
 */
export const BlurOverlay = ({ regions }: BlurOverlayProps) => (
  <div className="pointer-events-none absolute inset-0">
    {regions.map((region) => (
      <div
        key={region.id}
        className="absolute rounded-sm border border-dashed border-primary bg-primary/10"
        style={{
          left: `${region.box.x}%`,
          top: `${region.box.y}%`,
          width: `${region.box.w}%`,
          height: `${region.box.h}%`,
        }}
      >
        <span className="absolute left-0 top-0 rounded-sm bg-primary px-xxs py-[1px] text-fm-caption text-primary-foreground">
          {region.label}
        </span>
      </div>
    ))}
  </div>
);
