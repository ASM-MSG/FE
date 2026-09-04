import type { ReactNode } from "react";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { renderWithProviders } from "@/test/render-with-providers";
import { ChipListPanel } from "./ChipListPanel";
import { ConsoleEntryBanner } from "./ConsoleEntryBanner";

/**
 * 콘솔 진입 배너 스모크 (MSG-555 AC 5·7·8·10).
 * 고정하는 계약: ① 문구 2줄이 하나의 링크(접근성 이름에 문구 포함)이고 ② 목적지가
 * CONSOLE_ROUTES.orgLogin이며 ③ ChipListPanel의 footer 슬롯이 **미지정 시 비파괴**라는 것.
 * 스크롤 영역 안 배치(sticky 아님)는 DOM 구조 단정 금지 규칙에 따라 브라우저 검증의 몫이다.
 */

const BANNER_HEAD = "여기 없는 행사를 운영하시나요?";
const BANNER_CTA = "공식 행사로 등록하면 지도에 노출됩니다 →";

afterEach(() => cleanup());

describe("콘솔 진입 배너 (AC 5)", () => {
  it("문구 2줄이 콘솔 로그인으로 가는 링크 하나로 렌더된다 — 접근성 이름에 문구가 담긴다 (AC 5·10)", () => {
    renderWithProviders(<ConsoleEntryBanner />);

    const link = screen.getByRole("link", {
      name: `${BANNER_HEAD} ${BANNER_CTA}`,
    });

    expect(link.getAttribute("href")).toBe(CONSOLE_ROUTES.orgLogin);
    expect(screen.getByText(BANNER_HEAD)).toBeTruthy();
    expect(screen.getByText(BANNER_CTA)).toBeTruthy();
  });

  it("목적지는 콘솔 로그인 경로다 — /org/login (AC 5·8)", () => {
    renderWithProviders(<ConsoleEntryBanner />);

    expect(screen.getByRole("link").getAttribute("href")).toBe("/org/login");
  });
});

describe("ChipListPanel footer 슬롯 — 비파괴 (AC 9)", () => {
  const renderShell = (footer?: ReactNode) =>
    renderWithProviders(
      <ChipListPanel
        theme="festival"
        count={1}
        isPending={false}
        isError={false}
        errorMessage="목록을 불러오지 못했어요"
        emptyMessage="지금 진행 중인 지역축제가 없어요"
        onRetry={vi.fn()}
        onClose={vi.fn()}
        footer={footer}
      >
        <p>송도해변축제</p>
      </ChipListPanel>,
    );

  it("footer를 주지 않으면 배너가 나타나지 않는다 — 기존 소비처 렌더 불변 (AC 9)", () => {
    renderShell();

    expect(screen.queryByText(BANNER_HEAD)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    // 기존 구성(헤더 개수 + 목록)은 그대로다
    expect(screen.getByText("· 1개")).toBeTruthy();
    expect(screen.getByText("송도해변축제")).toBeTruthy();
  });

  it("footer를 주면 목록과 함께 렌더된다 (AC 3·4)", () => {
    renderShell(<ConsoleEntryBanner />);

    expect(screen.getByText("송도해변축제")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      CONSOLE_ROUTES.orgLogin,
    );
  });

  it("로딩 중에는 배너도 노출되지 않는다 — 도트 로더만 (AC 7 경계)", () => {
    renderWithProviders(
      <ChipListPanel
        theme="festival"
        count={0}
        isPending
        isError={false}
        errorMessage="목록을 불러오지 못했어요"
        emptyMessage="지금 진행 중인 지역축제가 없어요"
        onRetry={vi.fn()}
        onClose={vi.fn()}
        footer={<ConsoleEntryBanner />}
      >
        <p>송도해변축제</p>
      </ChipListPanel>,
    );

    expect(screen.queryByText(BANNER_HEAD)).toBeNull();
  });
});
