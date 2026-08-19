import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@fillmap/ui-native";

interface ConsentTermsViewProps {
  /** 약관 문서명 — 헤더 제목 (CONSENT_ITEMS의 termsTitle) */
  title: string;
  /** 닫기 — 동의 화면으로 돌아온다 (체크 상태는 상위가 보유하므로 유지된다) */
  onClose: () => void;
}

/**
 * 약관 전문 뷰 (AC 25) — 게이트 **내부** 전면 뷰다. 라우트가 아닌 이유는 게이트가
 * `Stack`(네비게이터) 자체를 대체하고 있어 이동할 라우터가 없고, 있더라도 그 경로가
 * 잠금이 새는 구멍이 되기 때문이다.
 *
 * 약관 전문 콘텐츠 작성은 기획/법무 몫이라 이 티켓의 제외 범위다 — 문서가 준비될 때까지
 * 안내 문구만 둔다 (티켓 [제외 범위] "화면은 빈 문서 또는 준비 중으로 처리", 승인 추정 8).
 */
export const ConsentTermsView = ({ title, onClose }: ConsentTermsViewProps) => (
  <SafeAreaView className="flex-1 bg-background">
    <AppHeader title={title} onBack={onClose} />
    <View className="flex-1 items-center justify-center gap-xs px-lg">
      <Text className="text-fm-base text-foreground">
        약관 전문은 준비 중이에요
      </Text>
      <Text className="text-center text-fm-body text-foreground-muted">
        문서가 준비되면 이 화면에서 바로 확인할 수 있어요
      </Text>
    </View>
  </SafeAreaView>
);
