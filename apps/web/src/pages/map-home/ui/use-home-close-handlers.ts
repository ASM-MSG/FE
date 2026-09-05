import { useCallback, useMemo } from "react";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import type { ThemeId } from "@/features/map-home/model/theme";

/**
 * Escape 우선순위 래핑 (MSG-277 3차 AC 13) — 미니 패널이 열려 있으면 그것만 닫고,
 * 아니면 원래 닫기를 실행한다. 패널의 useEscapeClose 훅·onClose 계약은 불변 —
 * 우선순위는 조합으로만 해결한다 (스펙 재사용 항목).
 */
const withMiniPanelPriority = (close: () => void) => () => {
  const mini = useVideoMiniPanelStore.getState();
  if (mini.selected) {
    mini.close();
    return;
  }
  close();
};

/**
 * 홈 패널 닫기 핸들러 묶음 (MSG-451 — 페이지 300줄 분할).
 * 뷰-레이어 훅: 스토어 액션에 미니 패널 우선순위를 씌우는 조합만 한다.
 */
export const useHomeCloseHandlers = (
  activeTheme: ThemeId | null,
): {
  /** 격자 상세 닫기 — 미니 패널이 열려 있으면 그것 먼저 */
  closeDetailMiniFirst: () => void;
  /** 칩 해제 — 미니 패널이 열려 있으면 그것 먼저 */
  closeThemeMiniFirst: () => void;
  /**
   * 행사방 뒤로가기 (MSG-518 AC 12·추정 5) — 미니 패널이 열려 있으면 그것 먼저,
   * 아니면 2단: 위치 선택 중이면 위치 해제(개요 복귀), 미선택이면 행사방 닫기
   */
  backEventRoomMiniFirst: () => void;
} => {
  const closeDetail = useHomeCellDetailStore((s) => s.close);
  const toggleTheme = useThemeFilterStore((s) => s.toggle);

  const closeThemeFilter = useCallback(() => {
    if (activeTheme) toggleTheme(activeTheme);
  }, [activeTheme, toggleTheme]);

  return {
    closeDetailMiniFirst: useMemo(
      () => withMiniPanelPriority(closeDetail),
      [closeDetail],
    ),
    closeThemeMiniFirst: useMemo(
      () => withMiniPanelPriority(closeThemeFilter),
      [closeThemeFilter],
    ),
    backEventRoomMiniFirst: useMemo(
      // 2단 분기 자체는 스토어 back()이 소유한다 (event-room-store 테스트가 고정)
      () => withMiniPanelPriority(() => useEventRoomStore.getState().back()),
      [],
    ),
  };
};
