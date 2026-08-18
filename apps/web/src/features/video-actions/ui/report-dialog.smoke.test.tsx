import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { ReportDialog } from "./ReportDialog";

/**
 * 신고 모달 스모크 (MSG-411 검증 단계 승격) — 성공 토스트 문구(AC 7)와 중복 신고
 * 11409 분기(AC 8)의 화면 계약을 고정한다. 신고 POST는 실서버 상태를 바꾸므로
 * 브라우저 실측 대신 stub-fetch로 판정한다(스펙 검증 프로파일 단서).
 * POST의 URL·body 값 판정은 use-video-mutations 훅 테스트가 덮는다.
 */

/** Radix 포퍼(Select.Content)가 jsdom에 없는 브라우저 API를 요구한다 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const errorEnvelope = (developCode: number, message: string, status: number) =>
  new Response(JSON.stringify({ developCode, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

/** open 상태를 실제로 소유하는 최소 부모 — 닫힘(모달 소멸)을 관찰 가능하게 한다 */
const ReportHarness = () => {
  const [open, setOpen] = useState(true);
  return <ReportDialog videoId={7} open={open} onOpenChange={setOpen} />;
};

/** 사유 선택(Radix Select) → 신고 제출까지의 공통 경로 */
const submitReport = async () => {
  // jsdom엔 실 포인터가 없어 키보드 계약(Enter=열기)으로 연다 — Radix Select 공통 경로
  const trigger = screen.getByRole("combobox", { name: "신고 사유" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  fireEvent.click(
    await screen.findByRole("option", { name: /스팸 또는 도배성 콘텐츠/ }),
  );
  const submit = screen.getByRole("button", { name: "신고" });
  await waitFor(() => expect(submit.hasAttribute("disabled")).toBe(false));
  fireEvent.click(submit);
};

describe("신고 모달 (AC 7·8)", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    // Radix Select가 jsdom에 없는 포인터 캡처·스크롤 API를 호출한다
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("신고 성공 시 POST가 발사되고 '검토 후 조치' 취지의 접수 토스트와 함께 모달이 닫힌다 (AC 6·7)", async () => {
    const received: ReceivedRequest[] = stubFetch(() =>
      envelopeResponse({ reportId: 1, status: "PENDING" }),
    );
    render(<ReportHarness />, { wrapper });

    await submitReport();

    expect(
      await screen.findByText("신고가 접수되었습니다. 검토 후 조치돼요."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "신고" })).toBeNull();
    expect(received.filter((r) => r.request.method === "POST")).toHaveLength(1);
  });

  it("중복 신고(409·developCode 11409)는 '이미 신고한 영상' 안내와 함께 모달이 닫힌다 — 일반 에러 문구로 새지 않는다 (AC 8)", async () => {
    stubFetch(() => errorEnvelope(11409, "이미 신고한 영상입니다.", 409));
    render(<ReportHarness />, { wrapper });

    await submitReport();

    expect(await screen.findByText(/이미 신고한 영상/)).toBeTruthy();
    expect(screen.queryByText(/신고를 접수하지 못했어요/)).toBeNull();
    expect(screen.queryByRole("button", { name: "신고" })).toBeNull();
  });

  it("그 외 실패는 일반 안내 토스트가 뜨고 모달이 유지된다 — 재시도 가능 (AC 8 경계)", async () => {
    stubFetch(() => errorEnvelope(9999, "서버 오류", 500));
    render(<ReportHarness />, { wrapper });

    await submitReport();

    expect(await screen.findByText(/신고를 접수하지 못했어요/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "신고" })).toBeTruthy();
  });
});
