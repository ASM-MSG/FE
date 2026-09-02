import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Avatar, SearchBar } from "@fillmap/ui-native";
import type { ThemeId } from "../model/themes";
import { ThemeChipsBar } from "./theme-chips-bar";

/**
 * 지도 홈 상단 바 (MSG-423 요구 3·4 → MSG-427 분리) — 검색바 + 프로필 + 테마 칩 행.
 * 화면이 300줄을 넘겨 떼어낸 조립 조각이다(react-doctor no-giant-component).
 * 상태를 갖지 않는다 — 선택 테마와 핸들러를 전부 받는다.
 */
interface HomeTopBarProps {
  /** 상단 safe area — 노치 아래로 내린다 */
  topInset: number;
  /** 현재 선택 테마 — null이면 칩 전부 비활성 */
  selectedTheme: ThemeId | null;
  onToggleTheme: (id: ThemeId) => void;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  /** 테마 칩 4종 뒤 슬롯 — 이벤트 칩 (MSG-557) */
  chipsTrailing?: ReactNode;
}

export const HomeTopBar = ({
  topInset,
  selectedTheme,
  onToggleTheme,
  onOpenSearch,
  onOpenProfile,
  chipsTrailing,
}: HomeTopBarProps) => (
  <View
    pointerEvents="box-none"
    className="absolute inset-x-0 top-0"
    style={{ paddingTop: topInset }}
  >
    <View className="flex-row items-center gap-sm px-md pt-sm">
      {/* 검색바 = 검색 화면 진입점 (MSG-297 AC 1) — 홈에서는 타이핑 불가:
          editable=false + pointerEvents 차단으로 탭 전체가 화면 전환만 한다 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="검색 화면 열기"
        onPress={onOpenSearch}
        className="flex-1 active:opacity-80"
      >
        <View pointerEvents="none">
          <SearchBar placeholder="장소, 격자, 영상 검색" editable={false} />
        </View>
      </Pressable>
      {/* 프로필 진입 (MSG-317 AC 18) — 바텀 내비 프로필 탭과 같은 목적지 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="프로필 열기"
        onPress={onOpenProfile}
        className="active:opacity-80"
      >
        <Avatar size="md" fallback="나" />
      </Pressable>
    </View>
    {/* 칩 행은 테마 선택과 무관하게 항상 보인다 (MSG-423 요구 4) */}
    <ThemeChipsBar
      selected={selectedTheme}
      onToggle={onToggleTheme}
      trailing={chipsTrailing}
    />
  </View>
);
