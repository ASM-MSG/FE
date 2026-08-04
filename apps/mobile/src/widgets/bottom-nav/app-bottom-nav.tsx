import { Compass, House, LayoutGrid, UserRound } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { semantic } from "@fillmap/design-tokens";
import { BottomNav, type BottomNavItem } from "@fillmap/ui-native";

/** 탭 키 → 라우트 (AC 12) — 촬영은 BottomNav 내장 카메라 버튼이라 여기 없음(동작 없음, 제외 범위) */
const TAB_ROUTES = {
  home: "/home",
  explore: "/explore",
  dex: "/dex",
  profile: "/profile",
} as const;

type TabKey = keyof typeof TAB_ROUTES;

const TAB_META: { key: TabKey; label: string; Icon: typeof House }[] = [
  { key: "home", label: "홈", Icon: House },
  { key: "explore", label: "탐색", Icon: Compass },
  { key: "dex", label: "도감", Icon: LayoutGrid },
  { key: "profile", label: "프로필", Icon: UserRound },
];

interface AppBottomNavProps {
  className?: string;
  /** 홈 화면에서 홈 탭 재탭 시 통지 — 시트 4단계(숨김) 복귀 수단 (AC 13, D12) */
  onHomeRetap?: () => void;
}

/**
 * 앱 공용 바텀 내비 조립체 (widgets, AC 12·16) — 2차: activeKey 홈 고정(구 D3) 해제,
 * 현재 라우트 기반 활성 + 탭 내비게이션 연결. RN은 아이콘 색 상속이 없어
 * 활성 탭 아이콘 색을 여기서 지정한다 (ui-native BottomNav 계약).
 */
export const AppBottomNav = ({ className, onHomeRetap }: AppBottomNavProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey =
    TAB_META.find((tab) => TAB_ROUTES[tab.key] === pathname)?.key ?? "home";

  const items: BottomNavItem[] = TAB_META.map(({ key, label, Icon }) => ({
    key,
    label,
    icon: (
      <Icon
        size={22}
        color={key === activeKey ? semantic.primary : semantic.muted}
      />
    ),
  }));

  const handleSelect = (key: string) => {
    if (key === activeKey) {
      if (key === "home") onHomeRetap?.();
      return;
    }
    router.navigate(TAB_ROUTES[key as TabKey]);
  };

  return (
    <BottomNav
      items={items}
      activeKey={activeKey}
      onSelect={handleSelect}
      className={className}
    />
  );
};
