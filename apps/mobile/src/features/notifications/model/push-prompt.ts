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
