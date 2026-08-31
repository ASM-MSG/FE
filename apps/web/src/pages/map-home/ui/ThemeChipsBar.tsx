import {
  Flame,
  PartyPopper,
  Route,
  Store,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@fillmap/ui-web";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import {
  THEME_META,
  THEME_ORDER,
  type ThemeId,
} from "@/features/map-home/model/theme";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useSidebarStore } from "@/widgets/map-shell/sidebar-store";
import { EventCapsule } from "./EventCapsule";
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
 * 홈 라우트 전용이며 **셸이 접힘 래퍼 밖에서 렌더한다** (MSG-403 AC 14) — 패널을 접어
 * 지도를 넓게 볼 때도 칩으로 화면을 바꿀 수 있어야 한다. 접히면 좌측 패널 자리가 비므로
 * 칩 바도 지도 좌상단으로 붙는다.
 * 미니 디테일 패널(w-97, left-97)이 열리면 겹치지 않게 그 폭만큼 우측 이동한다 (MSG-277 3차
 * AC 15, 추정 3) — 칩 해제·전환이 미니를 닫으므로 이동 후에도 칩 상호작용은 유효하다.
 */
export const ThemeChipsBar = () => {
  const activeTheme = useThemeFilterStore((s) => s.activeTheme);
  const toggle = useThemeFilterStore((s) => s.toggle);
  const miniPanelOpen = useVideoMiniPanelStore((s) => s.selected !== null);
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-md z-10 ml-md flex gap-xs transition-transform",
        collapsed ? "left-0" : "left-97",
        !collapsed && miniPanelOpen && "translate-x-97",
      )}
    >
      <div role="group" aria-label="테마 필터" className="flex gap-xs">
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
              onClick={() => {
                // 테마 칩 활성화는 행사방과 상호 배타 (MSG-516 추정 6) — 유령 패널 방지.
                // 해제 클릭에서는 방이 이미 닫혀 있어(배타 유지) 무동작이다
                useEventRoomStore.getState().close();
                toggle(id);
              }}
            />
          );
        })}
      </div>
      {/* 위치 기반 행사 캡슐 (MSG-516 AC 3) — 테마 칩 4종 오른쪽, 같은 바에 이어붙는다 */}
      <EventCapsule />
    </div>
  );
};
