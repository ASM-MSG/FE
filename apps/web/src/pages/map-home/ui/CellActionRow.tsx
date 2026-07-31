import { Bookmark, ListVideo, Plus, Share2 } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type { HomeCellDetail } from "@/features/map-home/model/home-cell-detail";

interface CellActionRowProps {
  /** 아이콘 강조 색 키 — 테마 상세는 테마 색, 비테마 점령 상세는 primary (AC 11) */
  accent: HomeCellDetail["accent"];
  /** 몰아보기 노출 — 기존 규칙(showMashup) 유지: 테마 상세만 4버튼, 비테마는 3버튼 (AC 4, 추정 1) */
  showMashup: boolean;
}

/** 액센트 아이콘 색 — 토큰 클래스 리터럴 표 (BADGE_CLASS 관례, tailwind 정적 스캔 대응) */
const ACCENT_TEXT_CLASS: Record<HomeCellDetail["accent"], string> = {
  primary: "text-primary",
  hot: "text-theme-hot",
  festival: "text-theme-festival",
  popup: "text-theme-popup",
  route: "text-theme-route",
};

/**
 * 셀 상세 액션 버튼 행 (MSG-277 2차 AC 3·4·5) — 네이버 장소 패널의 길찾기·저장·공유 행 참고.
 * 아이콘 위·라벨 아래 세로 스택, flex 균등 폭 (추정 3). 기존 하단 고정 버튼 2개를 대체.
 * 실동작은 제외 범위 — 전부 no-op(클릭 배선 없음, AC 5).
 */
export const CellActionRow = ({ accent, showMashup }: CellActionRowProps) => {
  const actions = [
    { label: "영상 추가", Icon: Plus },
    ...(showMashup ? [{ label: "몰아보기", Icon: ListVideo }] : []),
    { label: "공유", Icon: Share2 },
    { label: "저장", Icon: Bookmark },
  ];

  return (
    <div className="flex rounded-md border border-border py-xs">
      {actions.map(({ label, Icon }) => (
        <button
          key={label}
          type="button"
          className="flex flex-1 flex-col items-center gap-xxs py-xxs"
        >
          <Icon aria-hidden className={cn("size-5", ACCENT_TEXT_CLASS[accent])} />
          <span className="text-fm-caption text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
};
