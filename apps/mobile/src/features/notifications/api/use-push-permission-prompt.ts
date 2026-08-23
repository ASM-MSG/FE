import { useCallback, useEffect, useRef, useState } from "react";
import { useAppForeground } from "../../../shared/use-app-foreground";
import {
  decidePushPrompt,
  shouldRegisterAfterSettings,
} from "../model/push-prompt";
import { readPermissionStatus } from "./notifications-adapter";
import { enablePush } from "./push-registration-flow";
import { pushDeps } from "./use-push-registration";

/**
 * 화면이 알아야 할 것은 하나뿐이다 — **설정 안내를 띄울 것인가**. 권한이 방금 허용됐는지,
 * 원래 허용돼 있었는지는 완료 화면의 관심사가 아니다.
 */
export type PushPromptOutcome = "none" | "settings-needed";

/**
 * 맥락 알림 권한 프롬프트 (MSG-447 기준 7·8·9) — 업로드 완료 오버레이가 마운트되는 순간에
 * 한 번 돈다.
 *
 * 여기가 물을 자리인 이유: 완료 오버레이는 "잠시 후 AI가 블러 처리를 마치면 알림으로
 * 알려드릴게요"라고 **약속한다**. MSG-429는 등록 진입점을 프로필 토글로만 두었기 때문에,
 * 프로필 설정에 들어가 본 적 없는 사용자에게는 그 약속이 지켜질 확률이 0이었다.
 *
 * 판정은 `decidePushPrompt`가 소유하고(결정 D3) 여기는 배선만 한다. 실제 요청·토큰 등록은
 * MSG-429의 `enablePush`를 그대로 쓴다 — 권한 요청 후 등록 순서와 실패 시 보관 규칙이 이미
 * 그 안에 있다.
 *
 * `failed`(토큰 취득·서버 등록 실패)를 안내로 올리지 않는 이유: 권한 문제가 아니라 재시도로
 * 풀리는 축이고, 업로드를 막 끝낸 사용자를 설정 화면으로 보낼 이유가 없다. 프로필 토글이
 * 그 축의 복구 경로다.
 */
export const usePushPermissionPrompt = (): PushPromptOutcome => {
  const [outcome, setOutcome] = useState<PushPromptOutcome>("none");
  const aliveRef = useRef(true);
  /**
   * 이 화면이 설정 안내를 띄운 적이 있는가 — 복귀 후 등록 여부의 조건이다(codex P1).
   * state가 아니라 ref인 이유: 포그라운드 콜백은 마운트 시점에 고정되므로 state를 읽으면
   * 낡은 값을 본다.
   */
  const noticeShownRef = useRef(false);

  const showNotice = useCallback(() => {
    noticeShownRef.current = true;
    if (aliveRef.current) setOutcome("settings-needed");
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    void (async () => {
      try {
        const decision = decidePushPrompt(await readPermissionStatus());
        if (decision === "skip") return;
        if (decision === "notice") {
          showNotice();
          return;
        }
        const result = await enablePush(pushDeps);
        if (result.status === "denied") showNotice();
      } catch {
        // 네이티브 모듈이 빠진 빌드 — 푸시 없음까지만 퇴화시키고 안내는 띄우지 않는다
      }
    })();
    return () => {
      aliveRef.current = false;
    };
  }, [showNotice]);

  /**
   * 설정 왕복 복귀 (codex P1) — 우리가 [설정 열기]로 내보낸 사용자가 권한을 켜고 돌아오면
   * **그때 등록한다**. 이 배선이 없으면 안내가 남은 채 토큰도 등록되지 않아, 완료 화면이
   * 약속한 알림이 끝내 오지 않는다. 프로필 토글이 기준 13에서 같은 이유로 재판독을 붙였다.
   */
  const handleForeground = useCallback(() => {
    void (async () => {
      try {
        const permission = await readPermissionStatus();
        if (!shouldRegisterAfterSettings(noticeShownRef.current, permission)) {
          return;
        }
        const result = await enablePush(pushDeps);
        if (!aliveRef.current || result.status !== "enabled") return;
        noticeShownRef.current = false;
        setOutcome("none");
      } catch {
        // 판독·등록 실패는 안내를 그대로 두고 다음 복귀에서 다시 시도된다
      }
    })();
  }, []);

  useAppForeground(handleForeground);

  return outcome;
};
