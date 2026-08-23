import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import { openAppSettings } from "../../../shared/app-settings";
import { PERMISSION_SETTINGS_LABEL } from "../model/permission-notice";

interface PermissionSettingsNoticeProps {
  message: string;
  className?: string;
}

/**
 * 인라인 권한 안내 + [설정 열기] (MSG-447 기준 8·11) — 화면을 막지 않는 안내다.
 *
 * 모달이 아닌 이유(결정 D5): 알림 권한은 사용자가 방금 요청한 동작이 아니라 부가 정보다.
 * 업로드를 막 끝낸 사람 앞에 차단형 다이얼로그를 세우지 않는다.
 *
 * 프로필에서 쓰일 때 이 컴포넌트가 `SettingToggleRow`의 `errorText`를 **대체**한다 —
 * 그 자리는 탭할 수 없는 `Text`라 사용자가 문구를 읽고도 갈 곳이 없었다. 행 컴포넌트를 고치지
 * 않고 형제로 붙이는 방식이라 MSG-448의 `setting-rows.tsx` 소유권과 충돌하지 않는다(결정 D4).
 */
export const PermissionSettingsNotice = ({
  message,
  className,
}: PermissionSettingsNoticeProps) => (
  <View className={cx("gap-xxs", className)}>
    {/* 상태가 화면에 남는 안내라 live region으로 낭독시킨다 (MSG-426 errorText와 같은 처리) */}
    <Text
      accessibilityLiveRegion="polite"
      className="text-fm-caption text-red-600"
    >
      {message}
    </Text>
    <Pressable
      accessibilityRole="button"
      onPress={() => void openAppSettings()}
      className="active:opacity-60"
    >
      <Text className="text-fm-caption font-semibold text-primary">
        {PERMISSION_SETTINGS_LABEL}
      </Text>
    </Pressable>
  </View>
);
