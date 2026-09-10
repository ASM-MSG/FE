import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import { Button, Dots } from "@fillmap/ui-native";
import { setOnboardingCompleted } from "../model/onboarding-storage";
import {
  ONBOARDING_STEPS,
  ctaLabelOf,
  nextActionOf,
  type OnboardingStepId,
} from "../model/onboarding-steps";
import { ONBOARDING_ILLUST_XML as fillIllust } from "../assets/illust-fill";
import { ONBOARDING_ILLUST_XML as recordIllust } from "../assets/illust-record";
import { ONBOARDING_ILLUST_XML as exploreIllust } from "../assets/illust-explore";

/**
 * SOURCE: Figma 미리보기 · 온보딩 1/2/3 (시안 적용) (node 14902:476 / 14902:581 / 14902:626).
 * 골격(빈 TopBar → 일러 → 강조 바 → 헤드라인 → 설명 → 도트 → CTA)만 소유한다 (MSG-590).
 * 문구·CTA 라벨·다음 동작은 전부 `model/onboarding-steps`의 파생이라 화면에는 분기 로직이 없다.
 *
 * 일러는 Figma export SVG를 XML 문자열로 들고 `SvgXml`로 그린다(MSG-430 뱃지 아트 경로).
 * `SvgXml`은 NativeWind cssInterop 미등록이라 className을 주지 않고 래퍼 View에만 클래스를 준다.
 */
const ILLUST_BY_STEP: Record<OnboardingStepId, string> = {
  fill: fillIllust,
  record: recordIllust,
  explore: exploreIllust,
};

/** 일러 낭독 라벨 — SVG 내부 도형이 개별 낭독되지 않게 래퍼 1개로 묶는다 (S10) */
const ILLUST_LABEL_BY_STEP: Record<OnboardingStepId, string> = {
  fill: "격자를 채워가는 동네 지도 일러스트",
  record: "짧은 영상을 기록하는 영상 카드 일러스트",
  explore: "핫한 구역이 표시된 지도 일러스트",
};

interface OnboardingScreenProps {
  /** 마지막 장 "시작하기" 탭 → 완료 영속 저장 후 호출 (부모가 진입 재판정) */
  onDone: () => void;
}

/**
 * 온보딩 3장 인트로 (MSG-292 → MSG-421 → MSG-590 시안 교체).
 * step은 저장하지 않는다 — 중간 이탈 후 재실행은 1장부터 (스펙 A1).
 * 장 전환은 상태 교체에 의한 즉시 전환이다 — 애니메이션 없음 (스펙 A1).
 * 건너뛰기는 없다 — 시안 TopBar가 비어 있고, 시작하기와 같은 경로였다 (승인 Q1).
 */
export const OnboardingScreen = ({ onDone }: OnboardingScreenProps) => {
  const [step, setStep] = useState(0);
  const content = ONBOARDING_STEPS[step];

  /**
   * 종료 경로(완료 저장 → 부모가 화면 전환) 연타 가드.
   * 화면이 사라지기 전에 탭이 두 번 들어올 수 있다 — 지금은 저장이 총함수고 콜백도 멱등이라
   * 부작용이 없지만, 여기에 실제 부작용(네트워크 콜 등)이 붙는 순간 조용히 이중 실행된다.
   *
   * 상태가 아니라 ref로 잠근다: 상태로 잠그고 `Button`의 `disabled`를 물리면 저장이 끝날 때까지
   * CTA가 흰 배경·회색 글씨로 바뀌어(ui-native Button의 disabled 배색) "CTA는 primary 채움 +
   * 흰 글씨"라는 화면 기준과 어긋난다. 재진입만 막고 렌더는 건드리지 않는다.
   * 잠금 해제는 없다 — 콜백이 항상 실행돼 이 화면이 언마운트된다.
   */
  const exitingRef = useRef(false);

  const handleCta = () => {
    const next = nextActionOf(step);
    if (next === "done") {
      if (exitingRef.current) return;
      exitingRef.current = true;
      void setOnboardingCompleted().then(onDone);
      return;
    }
    // 장 넘김은 잠그지 않는다 — 빠른 연타로 여러 장을 넘기는 것은 의도된 조작이다
    setStep(next);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* TopBar 52px — 시안에서 비어 있다 (건너뛰기 없음, 승인 Q1) */}
      <View className="h-13" />
      {/* 일러 390×485 — flex-1 안에서 비율 유지 축소 (승인 Q6) */}
      <View
        accessible
        accessibilityLabel={ILLUST_LABEL_BY_STEP[content.id]}
        className="flex-1 items-center justify-center overflow-hidden"
      >
        <SvgXml xml={ILLUST_BY_STEP[content.id]} width="100%" height="100%" />
      </View>
      <View className="items-center gap-md px-lg pb-11 pt-xs">
        {/* 강조 바 40×5 — 헤드라인 위 (S5) */}
        <View className="h-1.25 w-10 rounded-full bg-primary" />
        <Text
          accessibilityRole="header"
          className="text-center text-fm-display text-foreground"
        >
          {content.headlineLines.join("\n")}
        </Text>
        <Text className="text-center text-fm-base text-foreground-body">
          {content.descriptionLines.join("\n")}
        </Text>
        {/* 진행 상태 낭독 — 도트 자체는 장식이라 래퍼가 progressbar 1개로 묶는다 (S10) */}
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: ONBOARDING_STEPS.length,
            now: step + 1,
          }}
        >
          <Dots
            count={ONBOARDING_STEPS.length}
            activeIndex={step}
            activeShape="pill"
          />
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
