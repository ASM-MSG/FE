import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { Search } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface SearchBarProps extends TextInputProps {
  className?: string;
  /** 검색 아이콘 클릭 시 호출 — 지정하면 아이콘이 클릭 가능한 버튼이 된다(미지정 시 장식용) */
  onSearch?: () => void;
}

/**
 * SOURCE: Figma "FeelMap SearchBar" (node 13431:710) — 지도 검색바 (h 48).
 * 웹의 focus-within은 RN에 없어 onFocus/onBlur 상태로 포커스 테두리를 재현한다.
 *
 * @example
 * <SearchBar placeholder="장소, 격자, 영상 검색" value={q} onChangeText={setQ} onSearch={submit} />
 */
export const SearchBar = ({
  className,
  onSearch,
  onFocus,
  onBlur,
  ...props
}: SearchBarProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className={cx(
        "h-12 w-full flex-row items-center gap-xs rounded-md border-[1.5px] bg-background pl-md pr-sm shadow-raised",
        focused ? "border-primary" : "border-transparent",
        className,
      )}
    >
      <TextInput
        placeholderTextColor={semantic.muted}
        className="flex-1 text-fm-title font-normal text-foreground"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {onSearch ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="검색"
          onPress={onSearch}
          className="active:opacity-60"
        >
          <Search size={20} color={semantic.iconDefault} />
        </Pressable>
      ) : (
        <Search size={20} color={semantic.iconDefault} />
      )}
    </View>
  );
};
