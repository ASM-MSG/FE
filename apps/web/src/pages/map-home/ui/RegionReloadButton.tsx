import { RotateCw } from "lucide-react";
import { reloadLabel } from "@/features/region/model/region-reload";

interface RegionReloadButtonProps {
  /** 현재 지도 중심의 새 행정동 이름 — 라벨 "{행정동} 장소 불러오기" (AC 8) */
  regionName: string;
  /** 클릭 — 헤더·격자 리스트를 새 행정동 기준으로 갱신 (AC 9) */
  onClick: () => void;
}

/**
 * "장소 불러오기" 재검색 pill 버튼 (MSG-328 AC 8·9, Figma 14357-18972 fab-load-places) —
 * 지도 이동으로 중심 행정동이 표시 중 행정동과 달라졌을 때 패널 하단 중앙에 뜬다.
 * 단일 사용처라 페이지 로컬 — 두 번째 사용처 등장 시 ui-web 승격 (스펙 승격 후보 없음).
 */
export const RegionReloadButton = ({
  regionName,
  onClick,
}: RegionReloadButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 items-center gap-xs whitespace-nowrap rounded-full bg-primary px-lg py-sm text-fm-body-strong text-primary-foreground shadow-raised transition-opacity active:opacity-80"
  >
    <RotateCw className="size-4" />
    {reloadLabel(regionName)}
  </button>
);
