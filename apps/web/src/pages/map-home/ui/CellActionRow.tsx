import { Bookmark, ListVideo, Plus, Share2 } from "lucide-react";

interface CellActionRowProps {
  /** 몰아보기 노출 — 기존 규칙(showMashup) 유지: 테마 상세만 4버튼, 비테마는 3버튼 (AC 4, 추정 1) */
  showMashup: boolean;
}

/**
 * 셀 상세 액션 버튼 행 (MSG-277 2차 AC 3·4·5 → 3차 AC 14 색 통일) —
 * 네이버 장소 패널의 길찾기·저장·공유 행 참고.
 * 아이콘 위·라벨 아래 세로 스택, flex 균등 폭 (추정 3). 기존 하단 고정 버튼 2개를 대체.
 * 아이콘 색은 테마 무관 primary 고정 (3차 AC 14) — 헤더 배지·시간대 그래프의 테마 색은
 * HomeCellDetail.accent를 그대로 쓰는 CellHourChart 소관으로 유지.
 * 실동작은 제외 범위 — 전부 no-op(클릭 배선 없음, 2차 AC 5·3차 제외 범위).
 */
export const CellActionRow = ({ showMashup }: CellActionRowProps) => {
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
          <Icon aria-hidden className="size-5 text-primary" />
          <span className="text-fm-caption text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
};
