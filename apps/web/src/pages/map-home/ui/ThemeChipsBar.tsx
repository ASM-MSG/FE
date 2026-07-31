import { Flame, PartyPopper, Route, Store, type LucideIcon } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import {
  THEME_META,
  THEME_ORDER,
  type ThemeId,
} from "@/features/map-home/model/theme";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { ThemeChip } from "./ThemeChip";

/**
 * 테마별 뷰 매핑 — 아이콘(플랫폼 산출물이라 model 밖) + 토큰 클래스 리터럴.
 * tailwind는 클래스를 정적 스캔하므로 동적 조립 대신 리터럴 표를 쓴다.
 */
const CHIP_VIEW: Record<
  ThemeId,
  { icon: LucideIcon; activeBg: string; iconColor: string }
> = {
  hot: { icon: Flame, activeBg: "bg-theme-hot", iconColor: "text-theme-hot" },
  festival: {
    icon: PartyPopper,
    activeBg: "bg-theme-festival",
    iconColor: "text-theme-festival",
  },
  popup: {
    icon: Store,
    activeBg: "bg-theme-popup",
    iconColor: "text-theme-popup",
  },
  route: {
    icon: Route,
    activeBg: "bg-theme-route",
    iconColor: "text-theme-route",
  },
};

/**
 * 지도 홈 상단 테마 칩 바 (MSG-252 AC 1) — 좌측 패널(w-97) 오른쪽에 뜨는 홈 오버레이.
 * 홈 라우트 전용이며 MapShell의 접힘 래퍼(Outlet) 안에 있어 접힘 시 패널과 함께 숨는다 (A6).
 * 미니 디테일 패널(w-97, left-97)이 열리면 겹치지 않게 그 폭만큼 우측 이동한다 (MSG-277 3차
 * AC 15, 추정 3) — 칩 해제·전환이 미니를 닫으므로 이동 후에도 칩 상호작용은 유효하다.
 */
export const ThemeChipsBar = () => {
  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const toggle = useThemeFilterStore((s) => s.toggle);
  const miniPanelOpen = useVideoMiniPanelStore((s) => s.selected !== null);

  return (
    <div
      role="group"
      aria-label="테마 필터"
      className={cn(
        "pointer-events-auto absolute left-97 top-md z-10 ml-md flex gap-xs transition-transform",
        miniPanelOpen && "translate-x-97",
      )}
    >
      {THEME_ORDER.map((id) => {
        const view = CHIP_VIEW[id];
        return (
          <ThemeChip
            key={id}
            label={THEME_META[id].label}
            icon={view.icon}
            active={activeTheme === id}
            activeBgClassName={view.activeBg}
            iconClassName={view.iconColor}
            onClick={() => toggle(id)}
          />
        );
      })}
    </div>
  );
};
