import type { PermissionState } from "../../../shared/permission-state";

/**
 * 맥락 알림 권한 프롬프트 판정 (MSG-447 기준 7·8·9) — 순수 모델.
 *
 * MSG-429 승인 D2는 "등록 진입점은 프로필 토글뿐 — 거부되면 되살릴 진입점이 사라진다"였다.
 * MSG-447이 설정 복구 동선을 만들면서 그 전제가 바뀌어(되살릴 진입점이 생겼다) 업로드 완료
 * 시점으로 진입점을 하나 넓히되, **확장을 최소로 묶는 것이 이 함수다**(결정 D3).
 */
export type PushPromptDecision = "prompt" | "notice" | "skip";

/**
 * - `undetermined` → **prompt**: 한 번도 안 물어본 사용자. 완료 오버레이가 "알림으로
 *   알려드릴게요"라고 약속하는 그 순간이 물을 자리다.
 * - `denied` → **notice**: OS가 두 번째부터 프롬프트를 띄우지 않는다. 다시 요청하면 사용자에게는
 *   아무 일도 일어나지 않으므로 설정 안내로 우회한다.
 * - `granted` → **skip**: 권한이 있는데 토큰이 없다면 그건 **사용자가 프로필 토글로 끈 것**이다.
 *   업로드가 그 결정을 조용히 뒤집지 않는다. 이미 켜둔 사용자는 상주 동기화가 이미 챙긴다.
 */
export const decidePushPrompt = (
  permission: PermissionState,
): PushPromptDecision =>
  permission === "undetermined"
    ? "prompt"
    : permission === "denied"
      ? "notice"
      : "skip";

/**
 * 설정 왕복에서 돌아온 뒤 등록할지 (**push 전 codex 리뷰 P1**).
 *
 * 완료 화면에서 권한을 거부한 사용자가 [설정 열기]로 나가 권한을 켜고 돌아오는 경로는
 * 종전에 **끊겨 있었다**: 안내는 그대로 남고 토큰 등록도 일어나지 않아, 완료 화면이 약속한
 * 알림이 끝내 오지 않았다. `decidePushPrompt("granted")`가 `skip`인 탓인데, 그 판정의
 * 전제("granted인데 토큰이 없으면 사용자가 토글로 끈 것")가 **이 경로에서만 거짓**이다 —
 * 사용자는 방금 알림을 켜려고 설정까지 다녀왔다.
 *
 * 두 상태를 가르는 것이 `noticeShown`이다. 안내를 띄운 적 없는 사용자에게는 아무 일도
 * 일어나지 않으므로 D3("업로드가 사용자의 OFF 결정을 뒤집지 않는다")는 그대로 지켜진다.
 */
export const shouldRegisterAfterSettings = (
  noticeShown: boolean,
  permission: PermissionState,
): boolean => noticeShown && permission === "granted";
