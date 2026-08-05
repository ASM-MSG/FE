import { useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import type { ThemeSheetModel } from "../model/theme-sheet";
import type { HomeSheetContentContext } from "./home-sheet";
import { ThemeVideoCard } from "./theme-video-card";

interface ThemeSheetContentProps extends HomeSheetContentContext {
  model: ThemeSheetModel;
}

/**
 * 시트 테마 탐색형 콘텐츠 (MSG-298 AC 11·12·17) — Figma 14094 "bottom-sheet(테마 피드)".
 * 상단 고정 헤더: 테마 배지(테마 색 12% 틴트 필 + 테마 색 텍스트) + "· N개"(muted).
 * 아래 스크롤 영역: 격자 섹션(테마 색 도트 + 격자명 + "· 영상 수") + 전폭 대표 영상 카드 반복.
 * 격자 0개면 빈 상태 문구 (AC 17 — 문구는 확정 7 빌더 재량). 테마 색은 model이 전달하는
 * 토큰 값이라 style로 주입한다 (grid-map SDK 색 주입과 동일 관례 — 임의값 클래스 아님).
 */
export const ThemeSheetContent = ({
  model,
  scrollGesture,
  scrollEnabled,
  onScrollOffsetChange,
}: ThemeSheetContentProps) => {
  // 콘텐츠 교체 재마운트 시 스크롤 가드 스테일 방지 — 새 스크롤 뷰는 오프셋 0 (쉘 계약)
  useEffect(() => {
    onScrollOffsetChange(0);
  }, [onScrollOffsetChange]);

  return (
    <View className="flex-1 gap-sm">
      <View className="flex-row items-center gap-1.5">
        <View
          className="rounded-[10px] px-1.75 py-0.75"
          style={{ backgroundColor: `${model.themeColor}1F` }}
        >
          <Text
            className="text-fm-caption font-medium"
            style={{ color: model.themeColor }}
          >
            {model.themeLabel}
          </Text>
        </View>
        <Text className="text-fm-label text-foreground-muted">
          · {model.badgeCount}개
        </Text>
      </View>
      {model.sections.length === 0 ? (
        <View className="flex-1 items-center pt-xl">
          <Text className="text-fm-body text-foreground-muted">
            이 테마의 격자가 아직 없어요
          </Text>
        </View>
      ) : (
        <GestureDetector gesture={scrollGesture}>
          <ScrollView
            style={{ flex: 1 }}
            scrollEnabled={scrollEnabled}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              onScrollOffsetChange(event.nativeEvent.contentOffset.y);
            }}
          >
            <View className="gap-sm pb-9">
              {model.sections.map((section) => (
                <View key={section.key} className="gap-sm">
                  <View className="flex-row items-center gap-xs">
                    <View
                      className="size-2 rounded-xs"
                      style={{ backgroundColor: model.themeColor }}
                    />
                    <Text className="text-fm-title text-foreground">
                      {section.label}
                    </Text>
                    <Text className="text-fm-label text-foreground-muted">
                      · {section.videoCount}개
                    </Text>
                  </View>
                  <ThemeVideoCard video={section.video} />
                </View>
              ))}
            </View>
          </ScrollView>
        </GestureDetector>
      )}
    </View>
  );
};
