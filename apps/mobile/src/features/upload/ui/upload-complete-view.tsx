import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button, Toast } from "@fillmap/ui-native";
import { usePushPermissionPrompt } from "../../notifications/api/use-push-permission-prompt";
import { PUSH_PERMISSION_DENIED_MESSAGE } from "../../notifications/model/push-registration";
import { PermissionSettingsNotice } from "../../permissions/ui/permission-settings-notice";
import { UPLOAD_COMPLETE_COPY } from "../model/analysis-copy";

interface UploadCompleteViewProps {
  /** [확인] — 업로드 스택 해제 + 지도 홈 복귀 + 플로우 초기화 (기준 29) */
  onConfirm: () => void;
}

/**
 * SOURCE: Figma "업로드 완료" (node 14824:486) — 확정 성공 안내 (기준 27·29).
 * 라우트가 아니라 미리보기 화면의 **전면 오버레이**로 렌더한다(D6) — 라우트로 만들면
 * 하드웨어 뒤로가기가 미리보기로 돌아가 이미 확정된 업로드를 재게시할 수 있다.
 *
 * 블러 안내 배너는 블러가 업로드 **후처리**로 빠졌다는 구조 변경을 알리는 핵심 카피라
 * 축약·변형하지 않는다(analysis-copy.UPLOAD_COMPLETE_COPY.blurNotice).
 * Figma의 🔔 아이콘은 재현하지 않는다 — ui-native Toast의 light 변형에 아이콘 슬롯이
 * 없고, 공통 컴포넌트 대신 배너를 화면에서 새로 조립하지 않기 위한 선택이다.
 *
 * [MSG-447 기준 7·8] 이 화면이 **알림 권한을 묻는 자리**다. 배너가 "알림으로 알려드릴게요"라고
 * 약속하는 바로 그 순간이라, 앱 첫 진입에 권한을 몰아 묻지 않고도 맥락이 성립한다. 이미
 * 거부된 사용자에게는 프롬프트 대신 설정 안내를 띄운다 — 다시 요청해 봐야 OS가 프롬프트를
 * 띄우지 않아 아무 일도 일어나지 않는다.
 */
export const UploadCompleteView = ({ onConfirm }: UploadCompleteViewProps) => {
  const insets = useSafeAreaInsets();
  const pushPrompt = usePushPermissionPrompt();

  return (
    <View
      className="absolute inset-0 items-center justify-center gap-sm bg-background px-5"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="size-16 items-center justify-center rounded-full bg-success/10">
        <Check size={28} strokeWidth={3} color={semantic.success} />
      </View>
      <Text className="mt-xs text-fm-heading text-foreground">
        {UPLOAD_COMPLETE_COPY.title}
      </Text>
      <Text className="text-fm-body text-foreground-body">
        {UPLOAD_COMPLETE_COPY.description}
      </Text>
      <Toast
        variant="light"
        className="mt-sm"
        title={UPLOAD_COMPLETE_COPY.blurNotice}
      />
      {pushPrompt === "settings-needed" && (
        <PermissionSettingsNotice
          className="mt-xs items-center"
          message={PUSH_PERMISSION_DENIED_MESSAGE}
        />
      )}
      <Button
        text={UPLOAD_COMPLETE_COPY.confirm}
        shape="pill"
        className="mt-md w-full"
        onPress={onConfirm}
      />
    </View>
  );
};
