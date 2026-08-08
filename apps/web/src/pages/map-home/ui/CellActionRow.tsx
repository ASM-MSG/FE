import { Bookmark, Plus, Share2 } from "lucide-react";

/**
 * 격자 상세 액션 버튼 행 (MSG-277 2차 AC 3·4·5 → 3차 AC 14 색 통일) —
 * 네이버 장소 패널의 길찾기·저장·공유 행 참고. Figma 셀 선택 프레임의 3버튼 구성.
 * 아이콘 위·라벨 아래 세로 스택, flex 균등 폭 (추정 3).
 * 아이콘 색은 테마 무관 primary 고정 (3차 AC 14).
 * 실동작은 제외 범위 — 전부 no-op(클릭 배선 없음, 2차 AC 5·3차 제외 범위).
 *
 * MSG-325: "몰아보기"(showMashup)는 격자 영상 목록에 의존하는데 그 목록이 제외 범위로
 * 빠져 동작 근거가 사라져 제거했다 — 격자 상세 연동 티켓에서 목록과 함께 복구한다.
 */
/** 버튼 구성은 상태와 무관한 고정값 — 모듈 스코프 1회 생성 (MSG-325: showMashup 분기 제거로 정적화) */
const ACTIONS = [
  { label: "영상 추가", Icon: Plus },
  { label: "공유", Icon: Share2 },
  { label: "저장", Icon: Bookmark },
];

export const CellActionRow = () => {
  return (
    <div className="flex rounded-md border border-border py-xs">
      {ACTIONS.map(({ label, Icon }) => (
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
