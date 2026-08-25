import { describe, expect, it } from "vitest";
import { decidePushPrompt, shouldRegisterAfterSettings } from "./push-prompt";

/**
 * 템플릿 ① 순수 로직 — 업로드 완료 맥락에서 알림 권한을 물을지 (MSG-447 기준 7·8·9).
 * MSG-429 승인 D2("등록 진입점은 프로필 토글뿐")를 이 티켓이 확장하되 **최소로** 묶는
 * 지점이라(결정 D3), 확장 범위를 순수 함수에 못박아 둔다.
 */
describe("decidePushPrompt — 맥락 프롬프트 판정 (기준 7·9)", () => {
  it("한 번도 물어본 적 없으면 프롬프트다 — 완료 오버레이가 알림을 약속하는 그 순간이다 (기준 7)", () => {
    expect(decidePushPrompt("undetermined")).toBe("prompt");
  });

  it("이미 거부됐으면 프롬프트 대신 안내다 — OS가 두 번째부터 프롬프트를 띄우지 않아 눌러도 아무 일이 없다 (기준 8)", () => {
    expect(decidePushPrompt("denied")).toBe("notice");
  });

  it("이미 허용됐으면 아무것도 하지 않는다 — 토글로 푸시를 꺼둔 사용자를 업로드가 몰래 재등록하지 않는다 (기준 9, D3)", () => {
    expect(decidePushPrompt("granted")).toBe("skip");
  });
});

/**
 * 템플릿 ① 순수 로직 — **push 전 codex 리뷰 P1**.
 *
 * 업로드 완료 화면에서 권한을 거부한 사용자가 [설정 열기]로 나가 권한을 켜고 돌아오면,
 * 종전에는 ① 안내가 그대로 남고 ② 토큰 등록도 일어나지 않았다. `decidePushPrompt("granted")`가
 * "skip"이기 때문인데, 그 판정의 전제("granted인데 토큰이 없으면 사용자가 토글로 끈 것")가
 * **이 경로에서는 거짓**이다 — 사용자는 방금 알림을 켜려고 설정까지 다녀왔다.
 *
 * 그래서 "안내를 띄웠던 사용자"라는 조건을 함께 본다. 그 이력이 없으면 종전대로 아무것도
 * 하지 않아 토글로 끈 사용자의 결정은 그대로 존중된다(결정 D3 유지).
 */
describe("shouldRegisterAfterSettings — 설정 왕복 복귀 후 등록 (codex P1)", () => {
  it("안내를 띄웠던 사용자가 권한을 켜고 돌아오면 등록한다 — 완료 화면이 약속한 알림을 지킨다", () => {
    expect(shouldRegisterAfterSettings(true, "granted")).toBe(true);
  });

  it("안내를 띄운 적 없으면 아무것도 하지 않는다 — 토글로 끈 사용자를 몰래 되켜지 않는다 (D3 유지)", () => {
    expect(shouldRegisterAfterSettings(false, "granted")).toBe(false);
  });

  it("돌아왔는데 여전히 권한이 없으면 등록하지 않는다 — 안내가 계속 필요하다", () => {
    expect(shouldRegisterAfterSettings(true, "denied")).toBe(false);
    expect(shouldRegisterAfterSettings(true, "undetermined")).toBe(false);
  });
});
