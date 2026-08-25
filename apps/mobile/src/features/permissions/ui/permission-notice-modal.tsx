import { ModalCard } from "@fillmap/ui-native";
import type { PermissionState } from "../../../shared/permission-state";
import { openAppSettings } from "../../../shared/app-settings";
import {
  derivePermissionNotice,
  type PermissionAxis,
} from "../model/permission-notice";

interface PermissionNoticeModalProps {
  axis: PermissionAxis;
  /** null이면 안내할 것이 없다 — 닫힌 상태 */
  state: PermissionState | null;
  onDismiss: () => void;
  /** 재요청 복구 — 다시 물을 수 있는 상태에서만 호출된다 */
  onRequest: () => void;
}

/**
 * 권한 안내 모달 (MSG-447 기준 2·3) — 지도 내 위치처럼 **사용자가 방금 누른 버튼이 아무 일도
 * 하지 않은** 상황에 쓴다.
 *
 * 차단형인 이유(결정 D5): 놓치면 왜 지도가 안 움직이는지 알 길이 없다. 반대로 알림 권한은
 * 사용자가 요청하지 않은 부가 정보라 인라인(`PermissionSettingsNotice`)으로 둔다.
 *
 * CTA는 상태가 정한다(`derivePermissionNotice`): 다시 물을 수 있으면 OS 프롬프트를 한 번 더,
 * 영구 거부면 시스템 설정으로. 영구 거부에 [권한 요청]을 남겨 두면 눌러도 아무 일이 없는
 * 버튼이 된다.
 */
export const PermissionNoticeModal = ({
  axis,
  state,
  onDismiss,
  onRequest,
}: PermissionNoticeModalProps) => {
  const notice = state === null ? null : derivePermissionNotice(axis, state);
  if (notice === null) return null;

  return (
    <ModalCard
      title={notice.title}
      description={notice.message}
      cancelText="닫기"
      confirmText={notice.actionLabel}
      onCancel={onDismiss}
      onOverlayPress={onDismiss}
      onConfirm={() => {
        // 복구 수단을 실행하기 전에 닫는다 — 설정 앱으로 나갔다 돌아왔을 때 모달이 남아 있으면
        // 방금 권한을 켠 사용자에게 "권한이 필요하다"는 화면이 그대로 보인다
        onDismiss();
        if (notice.recovery === "settings") {
          void openAppSettings();
          return;
        }
        onRequest();
      }}
    />
  );
};
