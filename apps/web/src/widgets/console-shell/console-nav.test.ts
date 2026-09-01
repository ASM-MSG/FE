import { describe, expect, it } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { activeConsoleNavKey } from "./console-nav";

const MENU = [
  {
    key: "submissions-status",
    label: "신청 현황",
    path: CONSOLE_ROUTES.orgHome,
  },
  {
    key: "submission-new",
    label: "새 행사 등록",
    path: CONSOLE_ROUTES.orgSubmissionNew,
  },
  { key: "guide", label: "등록 가이드", path: CONSOLE_ROUTES.orgGuide },
  { key: "settings", label: "계정 설정", path: CONSOLE_ROUTES.orgSettings },
];

describe("activeConsoleNavKey — 현재 경로의 콘솔 메뉴 활성 판정 (AC 5)", () => {
  it("경로가 정확히 일치하는 항목을 활성으로 본다 (AC 5)", () => {
    expect(activeConsoleNavKey(CONSOLE_ROUTES.orgGuide, MENU)).toBe("guide");
  });

  it("하위 경로에서는 더 긴(구체적인) 항목이 활성이다 — 루트 항목에 먹히지 않는다 (AC 5)", () => {
    expect(activeConsoleNavKey(CONSOLE_ROUTES.orgSubmissionNew, MENU)).toBe(
      "submission-new",
    );
  });

  it("항목의 하위 경로도 그 항목을 활성으로 유지한다 (AC 5)", () => {
    expect(activeConsoleNavKey("/org/settings/email", MENU)).toBe("settings");
  });

  it("콘솔 루트 경로는 루트 항목이 활성이다 (AC 5)", () => {
    expect(activeConsoleNavKey(CONSOLE_ROUTES.orgHome, MENU)).toBe(
      "submissions-status",
    );
  });

  it("일치하는 항목이 없으면 undefined다 (경계)", () => {
    expect(
      activeConsoleNavKey(CONSOLE_ROUTES.adminReview, MENU),
    ).toBeUndefined();
  });

  it("경로 조각이 걸쳐도 접두만으로 오탐하지 않는다 — /org/guidebook은 /org/guide가 아니다 (경계)", () => {
    expect(activeConsoleNavKey("/org/guidebook", MENU)).toBe(
      "submissions-status",
    );
  });

  it("한 항목이 여러 라우트를 대표하면 matches 경로에서도 활성이다 — 관리자 레일 '행사' (AC 5)", () => {
    const rail = [
      { key: "accounts", label: "계정", path: CONSOLE_ROUTES.adminAccounts },
      {
        key: "events",
        label: "행사",
        path: CONSOLE_ROUTES.adminReview,
        matches: [CONSOLE_ROUTES.adminEvents],
      },
    ];

    expect(activeConsoleNavKey(CONSOLE_ROUTES.adminEvents, rail)).toBe(
      "events",
    );
    expect(activeConsoleNavKey(CONSOLE_ROUTES.adminReview, rail)).toBe(
      "events",
    );
    expect(activeConsoleNavKey(CONSOLE_ROUTES.adminAccounts, rail)).toBe(
      "accounts",
    );
  });
});
