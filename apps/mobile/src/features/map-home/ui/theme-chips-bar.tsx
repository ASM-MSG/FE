import { ScrollView } from "react-native";
import { Flame, PartyPopper, Route, Store } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { THEME_IDS, THEME_META } from "../model/themes";
import type { ThemeId } from "../model/themes";
import { ThemeChip } from "./theme-chip";

/**
 * 지도 홈 상단 테마 칩 바 (MSG-423 요구 3·4) — 칩 4종을 항상 표시하고, 선택된 칩만
 * 테마 색으로 채운다. 선택 칩 재탭 = 해제(model `toggleTheme`)이고, 해제 X를 시트
 * 헤더에 두는 것은 MSG-427 소관이다 (승인 Q5).
 *
 * 아이콘은 플랫폼 산출물이라 model 밖(여기)에 둔다 — 라벨·색은 THEME_META·
 * themeChipView가 정본 (웹 ThemeChipsBar CHIP_VIEW와 동일 분담).
 */
const CHIP_ICONS: Record<ThemeId, LucideIcon> = {
  hot: Flame,
  festival: PartyPopper,
  popup: Store,
  route: Route,
};

interface ThemeChipsBarProps {
  /** 현재 선택 테마 — null이면 전부 비활성 */
  selected: ThemeId | null;
  onToggle: (id: ThemeId) => void;
}

export const ThemeChipsBar = ({ selected, onToggle }: ThemeChipsBarProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className="mt-sm"
    contentContainerClassName="gap-xs px-md"
  >
    {/* 칩 4종 고정 배열 — 규칙 문서 suppress-when(10행 미만 고정 배열, 가상화 이득 없음) 해당 */}
    {/* react-doctor-disable-next-line react-doctor/rn-no-scrollview-mapped-list */}
    {THEME_IDS.map((id) => (
      <ThemeChip
        key={id}
        id={id}
        label={THEME_META[id].label}
        icon={CHIP_ICONS[id]}
        active={selected === id}
        onPress={() => onToggle(id)}
      />
    ))}
  </ScrollView>
);
