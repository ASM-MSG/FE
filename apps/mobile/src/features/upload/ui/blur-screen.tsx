import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Button, Toast } from "@fillmap/ui-native";
import { useUploadFlow } from "../model/upload-flow-store";
import { BlurPreview } from "./blur-preview";

/**
 * SOURCE: Figma "AI 자동 블러 확인" (node 14094:4392) — 업로드 플로우 3/4 (MSG-304).
 * AI가 영상 전체에 블러를 적용했다는 결과 확인 화면 — 블러 개수·영역 편집은 정책상
 * 없음 (AC 5: 개수는 화면 어디에도 표시하지 않는다). 블러 처리는 mock.
 * CTA로 미리보기(/upload/preview) 전진. 하단 탭바 없음이 정상.
 */
export const BlurScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { video } = useUploadFlow();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="AI 자동 블러 확인" onBack={() => router.back()} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-md">
        <BlurPreview video={video} />
        {/* 다크 토스트 (AC 5) — 체크 아이콘 슬롯 */}
        <Toast
          className="mt-md"
          title="AI 자동 블러 완료"
          description="영상 전체에 블러 처리가 적용됐어요"
          icon={<Check size={16} strokeWidth={3} color={semantic.onPrimary} />}
        />
      </ScrollView>
      {/* CTA (AC 6) — 미리보기로 전진 */}
      <View
        className="px-5 pt-sm"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          text="확인 후 다음 단계"
          shape="pill"
          className="w-full"
          onPress={() => router.navigate("/upload/preview")}
        />
      </View>
    </View>
  );
};
