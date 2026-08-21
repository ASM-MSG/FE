import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import { DEX_TAB_ITEMS, type DexTab } from "../model/dex-tab";

interface DexTabBarProps {
  active: DexTab;
  onSelect: (tab: DexTab) => void;
}

/**
 * SOURCE: Figma "개인 도감 — 지도 탭"(node 14799:26328) 탭 바 — MSG-425 S3.
 * [지도 | 뱃지 | 기록] pill 3개, 활성만 primary 채움.
 *
 * **[공통 탭] `DEX_TAB_ITEMS`만 본다 — MSG-430은 이 파일을 수정하지 않는다.**
 *
 * `ui-native` `Chip`을 쓰지 않는 이유(웹 `DexTabs`와 동일 판단): ① 활성 시 `Check`
 * 아이콘을 그려 폭이 변한다(Figma 정본에 체크 없음 — 3탭이 흔들린다) ② `h-8`·`px-3.5`·
 * `text-fm-label`이 Figma 실측(28px·12px·13/600)과 어긋난다. 승격하지 않는다 —
 * MSG-430이 이 파일을 그대로 재사용하므로 두 번째 사용처가 생기지 않는다.
 */
export const DexTabBar = ({ active, onSelect }: DexTabBarProps) => (
  <View accessibilityRole="tablist" className="flex-row gap-xs">
    {DEX_TAB_ITEMS.map(({ key, label }) => (
      <Pressable
        key={key}
        accessibilityRole="tab"
        accessibilityState={{ selected: key === active }}
        onPress={() => onSelect(key)}
        className={cx(
          "rounded-full px-3 py-1.5 active:opacity-80",
          key === active
            ? "bg-primary"
            : "border border-border bg-surface-soft",
        )}
      >
        <Text
          className={cx(
            "text-fm-body-strong",
            key === active ? "text-primary-foreground" : "text-foreground-body",
          )}
        >
          {label}
        </Text>
      </Pressable>
    ))}
  </View>
);
