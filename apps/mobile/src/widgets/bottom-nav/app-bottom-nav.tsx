import { Compass, House, LayoutGrid, UserRound } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { BottomNav, type BottomNavItem } from "@fillmap/ui-native";

/**
 * 앱 공용 바텀 내비 조립체 — 홈·탐색·(촬영)·도감·프로필 (AC 12·16, widgets).
 * RN은 아이콘 색 상속이 없어 활성 탭 아이콘 색을 여기서 지정한다 (ui-native BottomNav 계약).
 * 탭 전환·촬영 동작은 제외 범위 (AC 12) — activeKey는 홈 고정이다. 격자 썸네일 뷰도
 * 지도 홈의 하위 화면이므로 홈 활성을 유지한다 (D3).
 */
const items: BottomNavItem[] = [
  {
    key: "home",
    label: "홈",
    icon: <House size={22} color={semantic.primary} />,
  },
  {
    key: "explore",
    label: "탐색",
    icon: <Compass size={22} color={semantic.muted} />,
  },
  {
    key: "dex",
    label: "도감",
    icon: <LayoutGrid size={22} color={semantic.muted} />,
  },
  {
    key: "profile",
    label: "프로필",
    icon: <UserRound size={22} color={semantic.muted} />,
  },
];

export const AppBottomNav = ({ className }: { className?: string }) => (
  <BottomNav items={items} activeKey="home" className={className} />
);
