import { describe, expect, it } from "vitest";
import { decidePushPrompt } from "./push-prompt";

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
