/**
 * "알림 받기" 토글 표시 상태 파생 (MSG-408 AC 4·8) — 순수 함수 (RN 재사용 대상).
 * 표시 정본 = 권한 granted && 보관 토큰 존재 (스펙 결정 1). 권한만 있고 토큰이 없으면 OFF.
 */
export interface PushToggleState {
  /** false면 행 비활성 + 미지원 안내 (AC 8) */
  supported: boolean;
  checked: boolean;
}

export const derivePushToggleState = (input: {
  supported: boolean;
  permission: NotificationPermission | null;
  hasStoredToken: boolean;
}): PushToggleState => ({
  supported: input.supported,
  checked:
    input.supported && input.permission === "granted" && input.hasStoredToken,
});
