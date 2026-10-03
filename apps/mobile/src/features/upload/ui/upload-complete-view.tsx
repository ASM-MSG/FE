import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-native";
import { usePushPermissionPrompt } from "../../notifications/api/use-push-permission-prompt";
import { PUSH_PERMISSION_DENIED_MESSAGE } from "../../notifications/model/push-registration";
import { PermissionSettingsNotice } from "../../permissions/ui/permission-settings-notice";
import type { EarnedBadgeResponseDto } from "../../../shared/api/sdk";
import { UPLOAD_COMPLETE_COPY } from "../model/analysis-copy";
import { BadgeEarnedModal } from "./badge-earned-modal";

interface UploadCompleteViewProps {
  /** 확정 응답 `newBadges` — 1개 이상이면 이 화면 위에 뱃지 획득 모달을 띄운다 (MSG-617) */
  newBadges: readonly EarnedBadgeResponseDto[];
  /** [확인] — 업로드 스택 해제 + 지도 홈 복귀 + 플로우 초기화 (기준 29) */
  onConfirm: () => void;
}

/**
 * SOURCE: Figma "업로드 완료" (node 14824:486) — 확정 성공 안내 (기준 27·29).
 * 라우트가 아니라 미리보기 화면의 **전면 오버레이**로 렌더한다(D6) — 라우트로 만들면
 * 하드웨어 뒤로가기가 미리보기로 돌아가 이미 확정된 업로드를 재게시할 수 있다.
 *
 * Figma의 🔔 블러 안내 배너는 **의도적으로 미노출**한다 — 서버가 블러를 끄며(MSG-567)
 * 블러 파이프라인을 삭제했고, 본문은 웹 MSG-476 문구를 미러한다. 결함 아님.
 *
 * [MSG-447 기준 7·8] 이 화면이 **알림 권한을 묻는 자리**다 — 프롬프트 시점·흐름은 불변이고
 * 맥락 문장만 사라졌다(MSG-567 A1). 이미 거부된 사용자에게는 프롬프트 대신 설정 안내를
 * 띄운다 — 다시 요청해 봐야 OS가 프롬프트를 띄우지 않아 아무 일도 일어나지 않는다.
 *
 * [MSG-617 D4·D5] 뱃지 획득 모달이 이 화면 **위에** 먼저 뜨고, 권한 프롬프트는 모달이 닫힌 뒤
 * 1회 돈다 — 역순이면 `enablePush`의 토큰 등록 네트워크를 축하가 기다리게 된다. 모달을 닫는
 * 경로([확인]·딤·뒤로가기)는 전부 `setBadgeModalOpen(false)`로 수렴하므로 프롬프트는 정확히 1회다.
 * "1회만 뜬다"는 추가 상태 없이 성립한다 — 확정 성공이 `uploadFlowStore.reset()`을 하므로
 * 콜드 스타트·이어가기가 이 화면에 다시 도달하지 않는다(D3).
 */
export const UploadCompleteView = ({
  newBadges,
  onConfirm,
}: UploadCompleteViewProps) => {
  const insets = useSafeAreaInsets();
  // `completion`은 한 번 설정되면 바뀌지 않으므로(D3) 초기값만 읽는다 — prop이 뒤에 바뀌는 사용처가 생기면 effect로 동기화할 것
  const [badgeModalOpen, setBadgeModalOpen] = useState(newBadges.length > 0);
  const pushPrompt = usePushPermissionPrompt(!badgeModalOpen);

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
      {badgeModalOpen && (
        <BadgeEarnedModal
          badges={newBadges}
          onClose={() => setBadgeModalOpen(false)}
        />
      )}
    </View>
  );
};
