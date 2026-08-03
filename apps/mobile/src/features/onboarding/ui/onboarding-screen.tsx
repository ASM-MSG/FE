import { useState } from "react";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Dots } from "@fillmap/ui-native";
import { setOnboardingCompleted } from "../model/onboarding-storage";
import illustrationFill from "../assets/onboarding-fill.png";
import illustrationRecord from "../assets/onboarding-record.png";
import illustrationExplore from "../assets/onboarding-explore.png";

/**
 * SOURCE: Figma 온보딩 1~3 (node 14133:521 / 14133:546 / 14133:575).
 * 문구는 티켓 [동작 요구] 정본 — 줄바꿈 위치까지 Figma를 따른다 (기준 2: 제목 2줄·설명 2줄).
 */
const SLIDES = [
  {
    illustration: illustrationFill,
    title: "우리 동네를 격자로\n하나씩 채워가요",
    description: "방문한 곳이 격자 위에 색으로 남아\n나만의 지도가 완성돼요",
    buttonLabel: "다음",
  },
  {
    illustration: illustrationRecord,
    title: "짧은 영상으로\n이 순간을 남겨요",
    description:
      "머문 장소에서 짧은 영상을 기록하면\n그날의 기억이 오래도록 남아요",
    buttonLabel: "다음",
  },
  {
    illustration: illustrationExplore,
    title: "지금 뜨는 동네를\n지도에서 찾아봐요",
    description: "핫구역과 인기 장소를 살펴보며\n다음 탐험지를 정해보세요",
    buttonLabel: "시작하기",
  },
] as const;

interface OnboardingScreenProps {
  /** 마지막 장 "시작하기" 탭 → 완료 영속 저장 후 호출 (부모가 홈 전환) */
  onDone: () => void;
}

/**
 * 온보딩 3장 인트로 (MSG-292). step은 저장하지 않는다 — 중간 이탈 후 재실행은 1장부터 (기준 6).
 */
export const OnboardingScreen = ({ onDone }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  const handlePress = () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
      return;
    }
    void setOnboardingCompleted().then(onDone);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-lg">
        {/* 장식 일러스트 — 스크린리더 노출 제외 (기준 8) */}
        <Image
          source={slide.illustration}
          accessible={false}
          resizeMode="contain"
          className="h-full w-full"
        />
      </View>
      <View className="items-center gap-lg px-lg pb-md">
        <View className="items-center gap-sm">
          {/* 액센트 바 (구분선) — 토큰에 그라디언트가 없어 primary 단색 (웹 시절 결정 승계) */}
          <View className="h-1 w-10 rounded-full bg-primary" />
          <Text
            accessibilityRole="header"
            className="text-center text-fm-display text-foreground"
          >
            {slide.title}
          </Text>
          <Text className="text-center text-fm-base text-foreground-body">
            {slide.description}
          </Text>
        </View>
        <Dots count={SLIDES.length} activeIndex={step} activeShape="pill" />
        <Button
          text={slide.buttonLabel}
          onPress={handlePress}
          className="w-full rounded-full"
        />
      </View>
    </SafeAreaView>
  );
};
