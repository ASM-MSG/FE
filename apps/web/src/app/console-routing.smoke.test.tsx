import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { consoleSessionFetch } from "@/test/console-session";
import {
  clearRobotsMetas,
  robotsContents,
  seedRobotsMeta,
} from "@/test/robots-meta";
import { CONSOLE_ROUTES } from "./console-routes";
import { consoleRoutes } from "./router";

/**
 * 콘솔 라우팅 스모크 (AC 2·10) — 스텁 라우트 정본 16경로 전부가 router에 등록돼
 * 직접 진입 시 해당 제목의 자리표시 화면을 렌더하고, 콘솔 마운트 중 robots 메타가
 * noindex인지를 고정한다. lazy 청크라 각 진입은 dynamic import 해소를 기다린다.
 */
const renderConsoleAt = (route: string) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider
        router={createMemoryRouter(consoleRoutes, { initialEntries: [route] })}
      />
    </QueryClientProvider>,
  );

/**
 * 경로 → 화면 제목 (스펙 "스텁 라우트 정본" 16경로).
 * MSG-542가 인증 3장을 실구현으로 교체하며 그 화면의 h1이 자리표시 제목에서 실제 화면
 * 제목으로 바뀌었다(`/org/password/reset`은 동일) — 라우트↔파일 1:1과 등록 자체는 불변이다.
 */
const STUB_TITLES: [path: string, title: string][] = [
  [CONSOLE_ROUTES.orgLogin, "행사 운영자 로그인"],
  [CONSOLE_ROUTES.orgPasswordSetup, "비밀번호를 새로 설정하세요"],
  [CONSOLE_ROUTES.orgPasswordReset, "비밀번호 재설정"],
  [CONSOLE_ROUTES.orgAccountRequest, "계정 발급 요청"],
  // MSG-545가 이 스텁을 실구현으로 교체하며 h1이 "내 행사 신청"이 됐다 (사이드바 메뉴는 "신청 현황")
  [CONSOLE_ROUTES.orgHome, "내 행사 신청"],
  [CONSOLE_ROUTES.orgSubmissionNew, "새 행사 등록"],
  [CONSOLE_ROUTES.orgSubmissions, "내 신청 목록"],
  ["/org/submissions/1204", "신청 상세"],
  ["/org/submissions/1204/edit", "새 행사 등록"],
  [CONSOLE_ROUTES.orgSettings, "계정 설정"],
  [CONSOLE_ROUTES.orgGuide, "등록 가이드"],
  // /admin 인덱스는 /admin/review로 replace 리다이렉트 (추정 4)
  // MSG-552가 심사 큐 스텁을 실화면으로 교체하며 제목이 "행사 심사" → "행사 등록 심사"로
  // 바뀌었다(MSG-552 AC 5) — 라우트 등록 자체를 고정하는 단정이므로 제목만 갱신한다
  [CONSOLE_ROUTES.adminHome, "행사 등록 심사"],
  [CONSOLE_ROUTES.adminAccounts, "계정 운영"],
  [CONSOLE_ROUTES.adminReview, "행사 등록 심사"],
  ["/admin/review/1204", "심사 상세"],
  // MSG-554에서 스텁이 실구현으로 교체되며 화면 제목이 "승인 행사 관리"가 됐다
  // (스펙 AC 1 · Figma 15579:2385). 사이드바 메뉴 라벨("승인 행사")은 그대로다
  [CONSOLE_ROUTES.adminEvents, "승인 행사 관리"],
];

describe("콘솔 스텁 라우팅 (AC 2)", () => {
  beforeEach(() => {
    signInForTest();
    consoleSessionFetch("ADMIN");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it.each(STUB_TITLES)(
    "%s 직접 진입 시 '%s' 자리표시 화면이 렌더된다 (AC 2)",
    async (path, title) => {
      renderConsoleAt(path);

      expect(
        await screen.findByRole("heading", { name: title, level: 1 }),
      ).toBeDefined();
    },
  );

  it("공개 콘솔 라우트는 비로그인으로도 열린다 (AC 7)", async () => {
    signOutForTest();

    renderConsoleAt(CONSOLE_ROUTES.orgAccountRequest);

    expect(
      await screen.findByRole("heading", { name: "계정 발급 요청", level: 1 }),
    ).toBeDefined();
  });
});

describe("콘솔 robots 메타 (AC 10)", () => {
  beforeEach(() => {
    signInForTest();
    consoleSessionFetch("ADMIN");
    seedRobotsMeta("index, follow");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
    clearRobotsMetas();
  });

  it("/org 마운트 중 robots 메타가 noindex이고 메타는 하나뿐이다 (AC 10)", async () => {
    renderConsoleAt(CONSOLE_ROUTES.orgHome);

    await screen.findByRole("heading", { name: "내 행사 신청", level: 1 });
    expect(robotsContents()).toEqual(["noindex"]);
  });

  it("/admin 마운트 중에도 noindex이며 언마운트 시 원값으로 복원된다 (AC 10)", async () => {
    const { unmount } = renderConsoleAt(CONSOLE_ROUTES.adminReview);

    await screen.findByRole("heading", { name: "행사 등록 심사", level: 1 });
    expect(robotsContents()).toEqual(["noindex"]);

    unmount();

    expect(robotsContents()).toEqual(["index, follow"]);
  });
});
