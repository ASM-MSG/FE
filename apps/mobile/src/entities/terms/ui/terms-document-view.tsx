import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@fillmap/ui-native";
import {
  TERMS_NOT_FOUND_DESCRIPTION,
  TERMS_NOT_FOUND_HEADER,
  TERMS_NOT_FOUND_TITLE,
  TERMS_PLACEHOLDER_DESCRIPTION,
  TERMS_PLACEHOLDER_TITLE,
  isTermsPlaceholder,
  resolveTermsDocument,
} from "../model/terms-documents";

interface TermsDocumentViewProps {
  /** 문서 키. 라우트 파라미터·딥링크로 임의 문자열이 올 수 있어 `string`이다 (기준 7) */
  docKey: string;
  /** 닫기 — 진입한 화면으로 돌아간다 (기준 6) */
  onClose: () => void;
}

/**
 * 약관 전문 뷰 (MSG-448 기준 3·4·6·7) — 문서 5종 × 진입 경로 2종이 공유하는 **표시 전용**
 * 컴포넌트. MSG-422의 `features/auth/ui/consent-terms-view.tsx`를 대체한다(문구 승계).
 *
 * 라우트가 아니라 컴포넌트인 이유: 회원가입 동의 게이트가 `Stack`(네비게이터) 자체를
 * 대체하고 있어 게이트 안에서는 이동할 라우터가 없고, 있더라도 그 경로가 잠금이 새는
 * 구멍이 된다. 라우트(`app/terms/[docKey].tsx`)는 이 컴포넌트를 감싸는 얇은 층이다.
 *
 * 본문이 비는 것은 미구현이 아니라 **문구 미확정 상태**다 — 작성은 기획·법무 몫이고
 * (티켓 [제외 범위]) 조회 API도 없다. 그 사실이 화면에 드러나야 한다 (기준 4).
 */
export const TermsDocumentView = ({
  docKey,
  onClose,
}: TermsDocumentViewProps) => {
  const document = resolveTermsDocument(docKey);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <AppHeader
        title={document?.title ?? TERMS_NOT_FOUND_HEADER}
        onBack={onClose}
      />
      {document === null ? (
        // 알 수 없는 문서 키 — 앱이 죽지 않고 상태를 말한다 (기준 7)
        <View className="flex-1 items-center justify-center gap-xs px-lg">
          <Text className="text-fm-base text-foreground">
            {TERMS_NOT_FOUND_TITLE}
          </Text>
          <Text className="text-center text-fm-body text-foreground-muted">
            {TERMS_NOT_FOUND_DESCRIPTION}
          </Text>
        </View>
      ) : isTermsPlaceholder(document) ? (
        // 문구 미확정 자리표시 (기준 4) — 제목은 정상 노출된다(문서 정체는 확정이다)
        <View className="flex-1 items-center justify-center gap-xs px-lg">
          <Text className="text-fm-base text-foreground">
            {TERMS_PLACEHOLDER_TITLE}
          </Text>
          <Text className="text-center text-fm-body text-foreground-muted">
            {TERMS_PLACEHOLDER_DESCRIPTION}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-md px-lg pb-lg pt-md">
          <Text className="text-fm-body text-foreground-body">
            {document.body}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
