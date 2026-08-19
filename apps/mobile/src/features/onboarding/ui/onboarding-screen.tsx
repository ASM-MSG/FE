import { useState } from "react";
import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, SegmentedProgress } from "@fillmap/ui-native";
import { setOnboardingCompleted } from "../model/onboarding-storage";
import {
  ONBOARDING_STEPS,
  ctaLabelOf,
  isSkipVisible,
  nextActionOf,
  progressOf,
  type OnboardingStepId,
} from "../model/onboarding-steps";
import { FillHeroCard } from "./fill-hero-card";
import { RecordHeroCard } from "./record-hero-card";
import { ExploreHeroCard } from "./explore-hero-card";

/**
 * SOURCE: Figma 온보딩 v2 · 1~3 (node 14875:430 / 14875:442 / 14875:454).
 * 골격(진행바 → 건너뛰기 → 헤드라인 → 히어로 → CTA)만 소유하고 장별 연출은 히어로 카드에 위임한다.
 * 문구·CTA 라벨·건너뛰기 노출·진행바 값은 전부 `model/onboarding-steps`의 파생이라
 * 화면에는 분기 로직이 없다.
 */
const HERO_BY_STEP: Record<OnboardingStepId, ComponentType> = {
  fill: FillHeroCard,
  record: RecordHeroCard,
  explore: ExploreHeroCard,
};

interface OnboardingScreenProps {
  /** 마지막 장 "시작하기" 탭 → 완료 영속 저장 후 호출 (부모가 홈 전환) */
  onDone: () => void;
  /** 1·2장 "건너뛰기" 탭 → 완료 영속 저장 후 호출 (부모가 로그인 전환, MSG-421 Q1) */
  onSkip: () => void;
}

/**
 * 온보딩 3장 인트로 (MSG-292 → MSG-421 리뉴얼).
 * step은 저장하지 않는다 — 중간 이탈 후 재실행은 1장부터 (스펙 A3).
 * 장 전환은 상태 교체에 의한 즉시 전환이다 — 애니메이션 없음 (스펙 A4).
 */
export const OnboardingScreen = ({ onDone, onSkip }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const content = ONBOARDING_STEPS[step];
  const Hero = HERO_BY_STEP[content.id];
  const { total, current } = progressOf(step);

  const handleCta = () => {
    const next = nextActionOf(step);
    if (next === "done") {
      void setOnboardingCompleted().then(onDone);
      return;
    }
    setStep(next);
  };

  const handleSkip = () => {
    void setOnboardingCompleted().then(onSkip);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-lg pb-lg pt-xs">
        <SegmentedProgress total={total} current={current} />
        {/* 건너뛰기 줄은 3장에서도 높이를 유지한다 — 헤드라인이 위아래로 튀지 않게 (S6) */}
        <View className="h-6 flex-row items-center justify-end">
          {isSkipVisible(step) && (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={handleSkip}
              className="active:opacity-80"
            >
              <Text className="text-fm-label text-foreground-muted">
                건너뛰기
              </Text>
            </Pressable>
          )}
        </View>
        <View className="items-center gap-xs pt-lg">
          <Text
            accessibilityRole="header"
            className="text-center text-fm-display text-foreground"
          >
            {content.headlineLines.join("\n")}
          </Text>
          <Text className="text-center text-fm-base text-foreground-muted">
            {content.description}
          </Text>
        </View>
        <View className="flex-1 justify-center">
          <Hero />
        </View>
        <Button
          text={ctaLabelOf(step)}
          onPress={handleCta}
          shape="pill"
          className="w-full"
        />
      </View>
    </SafeAreaView>
  );
};
