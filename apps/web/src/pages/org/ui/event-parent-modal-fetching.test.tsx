import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { EventParentModal } from "./EventParentModal";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const EVENTS_BODY = {
  totalCount: 2,
  cityCounts: [{ cityName: "부산", count: 2 }],
  events: [
    {
      occurrenceId: 1,
      name: "부산 불꽃축제",
      startsAt: "2026-09-05T00:00:00Z",
      endsAt: "2026-09-07T00:00:00Z",
      placeLabel: "광안리",
    },
  ],
};

describe("EventParentModal — 필터 전환 중 선택·확정 잠금 (codex 리뷰 P2)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("재조회가 끝나기 전에는 직전 목록에서 선택·확정할 수 없다", async () => {
    const release: { fn: (() => void) | null } = { fn: null };
    let call = 0;
    vi.stubGlobal("fetch", async () => {
      call += 1;
      if (call === 1) return envelopeResponse(EVENTS_BODY);
      await new Promise<void>((resolve) => {
        release.fn = resolve;
      });
      return envelopeResponse(EVENTS_BODY);
    });

    render(
      <EventParentModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialOccurrenceId={null}
      />,
      { wrapper },
    );

    // 1차 응답 도착 — 항목 선택 가능
    const item = await screen.findByRole("radio", { name: /부산 불꽃축제/ });
    fireEvent.click(item);
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: /계속|부산 불꽃축제/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );

    // 시 칩 클릭 → 2차 재조회 pending (응답 보류)
    fireEvent.click(screen.getByRole("button", { name: "부산" }));
    await waitFor(() => expect(call).toBe(2));

    // 직전 목록이 남아 있어도(keepPreviousData) 선택·확정은 잠긴다
    expect(
      (
        screen.getByRole("radio", {
          name: /부산 불꽃축제/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: /계속|부산 불꽃축제|이벤트 선택/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    // 응답 도착 → 잠금 해제
    release.fn?.();
    await waitFor(() =>
      expect(
        (
          screen.getByRole("radio", {
            name: /부산 불꽃축제/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
});
