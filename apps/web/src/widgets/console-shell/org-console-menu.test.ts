import { describe, expect, it } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { activeConsoleNavKey } from "./console-nav";
import { ADMIN_CONSOLE, ORG_CONSOLE } from "./console-config";

/**
 * 운영자 사이드바 "내 신청 목록" 진입로 (MSG-549 AC 12) — 티켓 문면의 사이드바 진입이
 * 현재 config로는 불가했다(메뉴 4항목에 없음). 이 티켓이 항목 하나를 더하며 그 자리와
 * 활성 판정(접두 최장 일치)을 고정하고, ADMIN 콘솔 무접촉을 함께 못 박는다.
 */
describe("ORG 콘솔 사이드바 메뉴 (MSG-549 AC 12)", () => {
  it("'내 신청 목록' 항목이 '새 행사 등록' 뒤에 있고 목록 경로를 가리킨다 (AC 12)", () => {
    const labels = ORG_CONSOLE.menu.map((item) => item.label);
    const item = ORG_CONSOLE.menu.find(
      (menuItem) => menuItem.label === "내 신청 목록",
    );

    expect(item?.path).toBe(CONSOLE_ROUTES.orgSubmissions);
    expect(labels.indexOf("내 신청 목록")).toBe(
      labels.indexOf("새 행사 등록") + 1,
    );
  });

  it("목록·상세·재신청 경로에서 그 항목이 활성이다 (AC 12)", () => {
    const key = ORG_CONSOLE.menu.find(
      (item) => item.label === "내 신청 목록",
    )?.key;

    expect(
      activeConsoleNavKey(CONSOLE_ROUTES.orgSubmissions, ORG_CONSOLE.menu),
    ).toBe(key);
    expect(activeConsoleNavKey("/org/submissions/12", ORG_CONSOLE.menu)).toBe(
      key,
    );
    expect(
      activeConsoleNavKey("/org/submissions/12/edit", ORG_CONSOLE.menu),
    ).toBe(key);
  });

  it("'/org/submissions/new'는 더 긴 '새 행사 등록'이 계속 이긴다 (AC 12 경계)", () => {
    expect(
      activeConsoleNavKey(CONSOLE_ROUTES.orgSubmissionNew, ORG_CONSOLE.menu),
    ).toBe("submission-new");
  });

  it("ADMIN 콘솔 메뉴는 이 티켓에서 변하지 않는다 (AC 13 — 보존 단정)", () => {
    expect(ADMIN_CONSOLE.menu.map((item) => item.label)).toEqual([
      "행사 심사",
      "승인 행사",
    ]);
  });
});
