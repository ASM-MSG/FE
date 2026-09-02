import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminEventsPage } from "@/pages/admin/AdminEventsPage";
import {
  approvedEventItem,
  approvedEventList,
  eventSubmissionDetail,
} from "@/test/admin-event-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";

/**
 * 승인 행사 관리 흐름 스모크 (MSG-554) — 탭 전환·행 선택·상세 카드·중지 모달의
 * 조립 계약만 고정한다. 파생 값 자체(기간·배지·요약 문자열)는
 * `features/admin-events/model/approved-event.test.ts`가 단정한다.
 */
const UNPUBLISHED_ITEM = approvedEventItem({
  submissionId: 41,
  unpublished: true,
  unpublishedAt: "2026-09-01T04:30:00Z",
  unpublishReason: "행사 정보가 사실과 다름",
});

interface StubOptions {
  /** EXPOSED 탭 목록 — 미지정이면 기본 1건 */
  exposed?: ReturnType<typeof approvedEventList>;
  /** 중지 응답 — 미지정이면 성공(emailSent true) */
  unpublishResponse?: () => Response;
}

const stubAdminEvents = ({ exposed, unpublishResponse }: StubOptions = {}) =>
  stubFetch(async (request) => {
    const { pathname, searchParams } = new URL(request.url);

    if (pathname.endsWith("/unpublish")) {
      return unpublishResponse === undefined
        ? envelopeResponse({
            submissionId: 41,
            unpublishedAt: "2026-09-01T04:30:00Z",
            emailSent: true,
          })
        : unpublishResponse();
    }
    if (pathname.startsWith("/api/admin/event-submissions/")) {
      return envelopeResponse(eventSubmissionDetail());
    }
    if (searchParams.get("status") === "UPCOMING") {
      return envelopeResponse(
        approvedEventList({
          events: [
            approvedEventItem({
              submissionId: 55,
              title: "북항 불꽃축제",
              status: "UPCOMING",
            }),
          ],
        }),
      );
    }
    return envelopeResponse(exposed ?? approvedEventList());
  });

const renderPage = () => renderWithProviders(<AdminEventsPage />);

/** 중지 사유 입력값 — 발사 바디 단정과 짝을 이룬다 */
const REASON = "행사 정보가 사실과 다름";

/** 목록 첫 행이 도착할 때까지 기다린다 */
const waitForRow = async (name: RegExp) =>
  await waitFor(() => screen.getByRole("row", { name }));

const selectFirstRow = async () => {
  fireEvent.click(await waitForRow(/서면 골목 빛축제/));
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

describe("승인 행사 관리 — 진입·탭 (AC 1·2)", () => {
  it("진입하면 헤더와 상태 탭 3종이 응답 카운트로 표시된다 (AC 1)", async () => {
    stubAdminEvents();

    renderPage();

    expect(
      screen.getByRole("heading", { name: "승인 행사 관리" }),
    ).toBeDefined();
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "노출 중 12" })).toBeDefined(),
    );
    expect(screen.getByRole("tab", { name: "예정 4" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "종료 31" })).toBeDefined();
  });

  it("탭을 클릭하면 목록과 카드 제목이 그 탭으로 교체되고 카운트는 유지된다 (AC 2)", async () => {
    stubAdminEvents();
    renderPage();
    await waitForRow(/서면 골목 빛축제/);

    fireEvent.click(screen.getByRole("tab", { name: "예정 4" }));

    await waitForRow(/북항 불꽃축제/);
    expect(screen.getByRole("heading", { name: "예정 행사" })).toBeDefined();
    expect(screen.queryByRole("row", { name: /서면 골목 빛축제/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "노출 중 12" })).toBeDefined();
  });

  it("테이블 행이 행사명·주최 기관·기간·상태 배지를 렌더한다 (AC 3)", async () => {
    stubAdminEvents();

    renderPage();

    const row = await waitForRow(/서면 골목 빛축제/);
    expect(row.textContent).toContain("부산진구 문화관광과");
    expect(row.textContent).toContain("9.5–9.7");
    expect(row.textContent).toContain("노출 중");
  });

  it("중지된 행사는 행 배지가 중지 상태로 구분된다 (AC 3)", async () => {
    stubAdminEvents({
      exposed: approvedEventList({ events: [UNPUBLISHED_ITEM] }),
    });

    renderPage();

    const row = await waitForRow(/서면 골목 빛축제/);
    expect(row.textContent).toContain("노출 중지");
  });
});

describe("승인 행사 관리 — 선택한 행사 카드 (AC 4·11·12)", () => {
  it("선택 전에는 빈 상태 안내가 보인다 (AC 4)", async () => {
    stubAdminEvents();

    renderPage();

    await waitForRow(/서면 골목 빛축제/);
    expect(screen.getByText(/행을 선택하면/)).toBeDefined();
  });

  it("행을 클릭하면 선택 강조되고 상세 카드에 승인일·기간·노출 범위가 표시된다 (AC 4)", async () => {
    stubAdminEvents();
    renderPage();

    await selectFirstRow();

    await waitFor(() =>
      expect(screen.getByText("2곳 · 사각형 3개 · 총 37칸")).toBeDefined(),
    );
    expect(
      screen
        .getByRole("row", { name: /서면 골목 빛축제/ })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText(/승인 8\.19/)).toBeDefined();
    expect(screen.getByText(/2026\. 9\. 5 – 9\. 7/)).toBeDefined();
  });

  it("이미 중지된 행사는 '노출 중지' 대신 중지 시각·사유를 보여 준다 (AC 11)", async () => {
    stubAdminEvents({
      exposed: approvedEventList({ events: [UNPUBLISHED_ITEM] }),
    });
    renderPage();

    await selectFirstRow();

    await waitFor(() =>
      expect(screen.getByText(/행사 정보가 사실과 다름/)).toBeDefined(),
    );
    expect(screen.getByText(/2026\. 9\. 1 중지/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "노출 중지" })).toBeNull();
  });

  it("빈 목록이면 빈 상태 안내가 보인다 (AC 12)", async () => {
    stubAdminEvents({ exposed: approvedEventList({ events: [] }) });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/노출 중인 행사가 없습니다/)).toBeDefined(),
    );
  });

  it("목록 조회가 실패하면 재시도할 수 있는 오류 안내가 보인다 (AC 12)", async () => {
    stubFetch(async () => errorEnvelope(13000, "서버 오류", 500));

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined(),
    );
  });
});

describe("승인 행사 관리 — 지도에서 보기 (AC 6)", () => {
  it("클릭하면 노출 영역 중심 좌표가 실린 유저 지도를 새 탭으로 연다 (AC 6)", async () => {
    stubAdminEvents();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    renderPage();
    await selectFirstRow();

    fireEvent.click(
      await waitFor(() =>
        screen.getByRole("button", { name: "지도에서 보기" }),
      ),
    );

    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toMatch(
      /^\/\?focus=35\.\d+,129\.\d+$/,
    );
  });
});

describe("승인 행사 관리 — 노출 중지 모달 (AC 7·8·9·10)", () => {
  const openDialog = async () => {
    await selectFirstRow();
    fireEvent.click(
      await waitFor(() => screen.getByRole("button", { name: "노출 중지" })),
    );
  };

  const typeReason = (reason: string) => {
    fireEvent.change(screen.getByLabelText("중지 사유"), {
      target: { value: reason },
    });
  };

  /** 실행(Act) 공통 — 행 선택 → 모달 열기 → 사유 입력 → 확정. 단정만 케이스별로 갈린다 */
  const confirmUnpublish = async (reason = REASON) => {
    await openDialog();
    typeReason(reason);
    fireEvent.click(screen.getByRole("button", { name: "중지 확정" }));
  };

  it("중지 성공 후 다시 열면 사유가 비어 있다 (codex 리뷰 P2 — 이전 사유 프리필 차단)", async () => {
    stubAdminEvents();
    renderPage();

    await confirmUnpublish();
    // 성공 경로 — 부모가 open을 직접 내려 모달이 닫힌다
    await waitFor(() =>
      expect(screen.queryByLabelText("중지 사유")).toBeNull(),
    );

    fireEvent.click(
      await waitFor(() => screen.getByRole("button", { name: "노출 중지" })),
    );

    const textarea = screen.getByLabelText("중지 사유") as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  it("사유가 비어 있으면 확정할 수 없고 통지 안내가 보인다 (AC 7)", async () => {
    stubAdminEvents();
    renderPage();

    await openDialog();

    expect(
      screen
        .getByRole("button", { name: "중지 확정" })
        .hasAttribute("disabled"),
    ).toBe(true);
    // 모달 안내는 카드 하단 상시 안내와 문구가 갈린다(티켓 문구 vs Figma 문구)
    expect(
      screen.getByText(/사라지며 운영자에게 사유가 통지됩니다/),
    ).toBeDefined();
  });

  it("공백뿐인 사유도 확정할 수 없다 (AC 7)", async () => {
    stubAdminEvents();
    renderPage();
    await openDialog();

    typeReason("   ");

    expect(
      screen
        .getByRole("button", { name: "중지 확정" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("사유를 넣고 확정하면 그 사유로 중지가 발사되고 모달이 닫힌다 (AC 8)", async () => {
    const received = stubAdminEvents();
    renderPage();

    await confirmUnpublish();

    await waitFor(() =>
      expect(screen.queryByLabelText("중지 사유")).toBeNull(),
    );
    const unpublishCall = received.find((entry) =>
      entry.request.url.endsWith("/unpublish"),
    );
    expect(unpublishCall?.body).toEqual({ reason: REASON });
  });

  it("409(13453)면 모달을 닫고 카드 안내로 알리며 목록을 재조회한다 (AC 9 + codex 리뷰 P2)", async () => {
    const received = stubAdminEvents({
      unpublishResponse: () =>
        errorEnvelope(13453, "이미 중지된 행사입니다", 409),
    });
    renderPage();
    const listCallsBefore = () =>
      received.filter(({ request }) =>
        new URL(request.url).pathname.endsWith("/api/admin/events"),
      ).length;
    await confirmUnpublish();
    const before = listCallsBefore();

    // 모달이 닫히고(사유 입력 소멸) 카드 안내에 '이미 중지'가 보인다
    await waitFor(() =>
      expect(screen.queryByLabelText("중지 사유")).toBeNull(),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("이미 중지"),
    );
    // 서버 진실이 바뀐 신호라 목록이 재조회된다 — 스테일 행 재확정 루프 차단
    await waitFor(() => expect(listCallsBefore()).toBeGreaterThan(before - 1));
  });

  it("emailSent=false면 중지는 유지된다는 안내가 보인다 (AC 10)", async () => {
    stubAdminEvents({
      unpublishResponse: () =>
        envelopeResponse({
          submissionId: 41,
          unpublishedAt: "2026-09-01T04:30:00Z",
          emailSent: false,
        }),
    });
    renderPage();

    await confirmUnpublish();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "노출 중지는 그대로 유지",
      ),
    );
  });
});
