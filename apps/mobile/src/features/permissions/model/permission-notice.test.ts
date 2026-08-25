import { describe, expect, it } from "vitest";
import { PUSH_PERMISSION_DENIED_MESSAGE } from "../../notifications/model/push-registration";
import { derivePermissionNotice } from "./permission-notice";

/**
 * 템플릿 ① 순수 로직 — 권한 축 × 상태 → 안내·복구 CTA (MSG-447 기준 2·3·8·11).
 * 이 파생이 이 티켓의 본체다: "거부됐을 때 사용자가 어디로 가는가"를 화면이 아니라
 * 순수 함수가 소유해야 모바일에서 회귀를 잡을 자산이 실기 말고도 남는다.
 */
describe("derivePermissionNotice — 권한 상태별 복구 동선 (기준 3)", () => {
  it("허용된 축에는 안내가 없다", () => {
    expect(derivePermissionNotice("location", "granted")).toBeNull();
    expect(derivePermissionNotice("notification", "granted")).toBeNull();
  });

  it("다시 물을 수 있으면 복구가 재요청이다 — 첫 거부 직후 OS 프롬프트를 한 번 더 띄운다 (기준 3, R3)", () => {
    expect(derivePermissionNotice("location", "undetermined")).toMatchObject({
      recovery: "request",
      actionLabel: "권한 요청",
    });
  });

  it("영구 거부면 복구가 시스템 설정 이동이다 — 프롬프트가 더는 뜨지 않아 앱 안에서 되살릴 수 없다 (기준 3)", () => {
    expect(derivePermissionNotice("location", "denied")).toMatchObject({
      recovery: "settings",
      actionLabel: "설정 열기",
    });
  });

  it("축마다 무엇이 막혔는지 다른 문구를 준다 — 위치는 지도, 알림은 푸시", () => {
    const location = derivePermissionNotice("location", "denied");
    const notification = derivePermissionNotice("notification", "denied");

    expect(location?.message).not.toBe(notification?.message);
    expect(location?.message).toContain("위치");
  });

  it("알림 축 문구는 MSG-429가 이미 쓰던 문구를 그대로 쓴다 — 같은 상황에 두 문구가 생기지 않게 (추정 2)", () => {
    expect(derivePermissionNotice("notification", "denied")?.message).toBe(
      PUSH_PERMISSION_DENIED_MESSAGE,
    );
  });
});

/**
 * MSG-447 **실기 회귀** — 안내 본문이 CTA와 어긋나던 결함.
 *
 * 실기에서 관찰: 프롬프트를 닫아 `undetermined`로 남은 상태에서 안내가 [권한 요청] 버튼을
 * 달고 뜨는데, 본문은 "**기기 설정에서** 허용해주세요"라고 말했다. 버튼은 앱 안에서 바로
 * 물어보겠다는데 글은 설정으로 가라고 하는 화면이라, 시키는 대로 설정에 다녀온 사용자는
 * 아무것도 못 고치고 돌아온다(그 상태에서는 설정에 바꿀 항목 자체가 없다).
 */
describe("derivePermissionNotice — 본문이 복구 수단과 일치한다 (MSG-447 실기 회귀)", () => {
  it("재요청 가능한 상태의 본문은 설정으로 보내지 않는다", () => {
    const notice = derivePermissionNotice("location", "undetermined");

    expect(notice?.recovery).toBe("request");
    expect(notice?.message).not.toContain("설정");
  });

  it("영구 거부 상태의 본문은 설정을 가리킨다 — 앱 안에서 되살릴 수단이 없다", () => {
    const notice = derivePermissionNotice("location", "denied");

    expect(notice?.recovery).toBe("settings");
    expect(notice?.message).toContain("설정");
  });

  it("알림 축도 같은 규칙을 지킨다 — 축마다 빈 칸을 남기면 같은 결함이 재발한다", () => {
    expect(
      derivePermissionNotice("notification", "undetermined")?.message,
    ).not.toContain("설정");
    expect(derivePermissionNotice("notification", "denied")?.message).toContain(
      "설정",
    );
  });
});
