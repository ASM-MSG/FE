import { View } from "react-native";
import { House, LayoutGrid, UserRound, UsersRound } from "lucide-react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic } from "@fillmap/design-tokens";
import { BottomNav, type BottomNavItem } from "@fillmap/ui-native";

/** 탭 키 → 라우트 (AC 12) — 촬영은 BottomNav 내장 카메라 버튼: onCamera → /upload (MSG-302 AC 1) */
const TAB_ROUTES = {
  home: "/home",
  friends: "/friends",
  dex: "/dex",
  profile: "/profile",
} as const;

type TabKey = keyof typeof TAB_ROUTES;

// MSG-420: 2번째 탭을 탐색 → 친구로 교체 (Figma ver 6 bottom-nav `Tab-친구`).
// 아이콘은 기존 4탭과 같은 lucide 매핑 관례 — 프로필(UserRound)과 계열이 맞는 UsersRound.
const TAB_META: { key: TabKey; label: string; Icon: typeof House }[] = [
  { key: "home", label: "홈", Icon: House },
  { key: "friends", label: "친구", Icon: UsersRound },
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
 * 4차: safe-area 하단 인셋 채움을 여기서 소유 — 내비 콘텐츠 높이는 유지하고
 * 배경만 화면 맨 아래까지 연장해 인셋에 지도·시트가 비치지 않는다 (AC 16, 홈·스텁 공통).
 */
export const AppBottomNav = ({ className, onHomeRetap }: AppBottomNavProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  // 매칭 없는 라우트(/upload 등)에서는 활성 탭 없음 — 홈 폴백 제거 (MSG-302 리스크 3,
  // 기존 탭 라우트에서는 항상 매칭되므로 동작 변화 없음)
  const activeKey = TAB_META.find(
    (tab) => TAB_ROUTES[tab.key] === pathname,
  )?.key;

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
    <View className={className}>
      <BottomNav
        items={items}
        activeKey={activeKey}
        onSelect={handleSelect}
        // 중앙 카메라 버튼 → 영상 업로드 플로우 진입 (MSG-302 AC 1 — MSG-296 제외 범위였던 연결)
        onCamera={() => router.navigate("/upload")}
      />
      {/* 시스템 제스처 인셋 배경 채움 (AC 16 4차) — 바 배경(canvas)의 연장 */}
      <View
        style={{ height: insets.bottom, backgroundColor: semantic.canvas }}
      />
    </View>
  );
};
