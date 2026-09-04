import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAccountsPage } from "@/pages/admin/AdminAccountsPage";
import {
  accountRequestDetail,
  accountRequestItem,
  accountRequestList,
  emailChangeList,
  orgAccountItem,
  orgAccountList,
} from "@/test/admin-account-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";

/**
 * 관리자 계정 운영 흐름 스모크 (MSG-551) — 탭 3종 조립·발급 폼·재발송 게이트·큐 선택·
 * 승인/반려 모달·빈/실패 상태의 계약만 고정한다. 파생 값 자체(폼 판정·상태 라벨·안내
 * 문구·실패 분기)는 `features/admin-accounts/model/account-view.test.ts`가 단정한다.
 *
 * **비밀번호 비노출(AC 8)**: 발급·승인·재발송 응답 스텁에 서버가 절대 싣지 않는
 * `initialPassword` 필드를 일부러 섞고, 어떤 경로로도 그 문자열이 화면에 나타나지
 * 않는지를 단정한다 — "응답에 없으니 안전"이 아니라 화면이 응답을 그대로 흘리지
 * 않는다는 것이 이 티켓의 계약이다.
 */
const LEAKED_PASSWORD = "TEMP-PW-9931";

const ISSUE_FORM = {
  기관명: "해운대구청",
  담당자: "박담당",
  "공식 이메일": "culture@haeundae.go.kr",
};

interface StubOptions {
  accounts?: ReturnType<typeof orgAccountList>;
  issueResponse?: () => Response;
  resendResponse?: () => Response;
  requests?: ReturnType<typeof accountRequestList>;
  requestDetail?: ReturnType<typeof accountRequestDetail>;
  approveResponse?: () => Response;
  rejectResponse?: () => Response;
  emailChanges?: ReturnType<typeof emailChangeList>;
  emailApproveResponse?: () => Response;
}

const stubAdminAccounts = ({
  accounts,
  issueResponse,
  resendResponse,
  requests,
  requestDetail,
  approveResponse,
  rejectResponse,
  emailChanges,
  emailApproveResponse,
}: StubOptions = {}) =>
  stubFetch(async (request) => {
    const { pathname } = new URL(request.url);

    if (pathname.endsWith("/resend-password")) {
      return resendResponse === undefined
        ? envelopeResponse({
            emailSent: true,
            initialPassword: LEAKED_PASSWORD,
          })
        : resendResponse();
    }
    if (pathname.endsWith("/approve")) {
      if (pathname.includes("email-change-requests")) {
        return emailApproveResponse === undefined
          ? envelopeResponse({
              requestId: 91,
              email: "culture@busanjin.go.kr",
              emailSent: true,
            })
          : emailApproveResponse();
      }
      return approveResponse === undefined
        ? envelopeResponse({
            userId: 502,
            emailSent: true,
            initialPassword: LEAKED_PASSWORD,
          })
        : approveResponse();
    }
    if (pathname.endsWith("/reject")) {
      return rejectResponse === undefined
        ? envelopeResponse(null)
        : rejectResponse();
    }
    if (pathname.startsWith("/api/admin/org-account-requests/")) {
      return envelopeResponse(requestDetail ?? accountRequestDetail());
    }
    if (pathname === "/api/admin/org-account-requests") {
      return envelopeResponse(requests ?? accountRequestList());
    }
    if (pathname === "/api/admin/email-change-requests") {
      return envelopeResponse(emailChanges ?? emailChangeList());
    }
    if (request.method === "POST") {
      return issueResponse === undefined
        ? envelopeResponse({
            userId: 502,
            emailSent: true,
            initialPassword: LEAKED_PASSWORD,
          })
        : issueResponse();
    }
    return envelopeResponse(accounts ?? orgAccountList());
  });

const renderPage = () => renderWithProviders(<AdminAccountsPage />);

const fillIssueForm = (overrides: Partial<typeof ISSUE_FORM> = {}) => {
  for (const [label, value] of Object.entries({
    ...ISSUE_FORM,
    ...overrides,
  })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
};

const submitIssueForm = () => {
  fireEvent.click(
    screen.getByRole("button", { name: "행사 운영자 계정 발급" }),
  );
};

const openTab = (name: string) => {
  fireEvent.click(screen.getByRole("tab", { name }));
};

/** 화면 전체 텍스트 — 비밀번호 비노출 단정용 */
const screenText = () => document.body.textContent ?? "";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

describe("계정 운영 — 진입·탭 (AC 8)", () => {
  it("진입하면 문서 제목이 '계정 운영 | 필맵'이고 운영자 계정 탭이 기본으로 열린다 (AC 8)", async () => {
    stubAdminAccounts();

    renderPage();

    expect(document.title).toBe("계정 운영 | 필맵");
    expect(screen.getByRole("heading", { name: "계정 운영" })).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "행사 운영자 계정 발급" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("tab", { name: "운영자 계정" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());
  });

  it("새 계정 폼에 인풋 3종과 24시간 내 변경 강제 안내가 있다 (AC 8)", () => {
    stubAdminAccounts();

    renderPage();

    expect(screen.getByLabelText("기관명")).toBeDefined();
    expect(screen.getByLabelText("담당자")).toBeDefined();
    expect(screen.getByLabelText("공식 이메일")).toBeDefined();
    expect(screen.getByText(/24시간 내 변경/)).toBeDefined();
    // 폼 안 [비밀번호 재발송] 버튼은 미구현이 정본 — 대상 식별자가 없다 (스펙 추정 3)
    expect(
      screen.queryByRole("button", { name: "비밀번호 재발송" }),
    ).toBeNull();
  });

  it("탭 3종으로 세 구획이 갈리고 아이디 변경 탭까지 열린다 (AC 8·13)", async () => {
    stubAdminAccounts();
    renderPage();

    openTab("발급 요청");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "계정 발급 요청" }),
      ).toBeDefined(),
    );

    openTab("아이디 변경");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "아이디 변경 요청" }),
      ).toBeDefined(),
    );
  });
});

describe("계정 운영 — 직접 발급 (AC 1·4·9)", () => {
  it("미충족 폼은 발급을 발사하지 않고 항목별 안내를 보여 준다 (AC 1)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());

    fillIssueForm({ 담당자: "박", "공식 이메일": "culture.haeundae" });
    submitIssueForm();

    expect(
      screen.getByText("담당자 이름은 2~20자로 입력해 주세요"),
    ).toBeDefined();
    expect(screen.getByText("이메일 형식으로 입력해 주세요")).toBeDefined();
    expect(received.some(({ request }) => request.method === "POST")).toBe(
      false,
    );
  });

  it("앞뒤 공백이 섞인 입력은 정규화한 값으로 전송된다 (AC 4 · codex P2)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());

    fillIssueForm({
      기관명: "  해운대구청 ",
      담당자: " 박담당  ",
      "공식 이메일": "  culture@haeundae.go.kr ",
    });
    submitIssueForm();

    await waitFor(() => {
      const post = received.find(
        ({ request }) =>
          request.method === "POST" &&
          new URL(request.url).pathname === "/api/admin/organizations",
      );
      // 판정은 trim한 값을 봤으므로 전송도 같아야 한다 — 원문이 나가면
      // 서버가 이메일을 거절하거나 공백이 그대로 저장된다
      expect(post?.body).toEqual({
        orgName: "해운대구청",
        contactName: "박담당",
        email: "culture@haeundae.go.kr",
      });
    });
  });

  it("발급 성공 시 발송 안내가 뜨고 폼이 비워지며 계정 목록을 재조회한다 (AC 9)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());
    const listCalls = () =>
      received.filter(
        ({ request }) =>
          new URL(request.url).pathname === "/api/admin/organizations" &&
          request.method === "GET",
      ).length;
    const before = listCalls();

    fillIssueForm();
    submitIssueForm();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "초기 비밀번호를 공식 이메일로 발송",
      ),
    );
    expect((screen.getByLabelText("기관명") as HTMLInputElement).value).toBe(
      "",
    );
    await waitFor(() => expect(listCalls()).toBeGreaterThan(before));
  });

  it("발급 응답이 비밀번호를 실어 와도 화면에는 나타나지 않는다 (AC 8)", async () => {
    stubAdminAccounts();
    renderPage();
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());

    fillIssueForm();
    submitIssueForm();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("발송"),
    );
    expect(screenText()).not.toContain(LEAKED_PASSWORD);
  });

  it("emailSent=false면 계정 유지 + 재발송 복구 안내가 보인다 (AC 2d·9)", async () => {
    stubAdminAccounts({
      issueResponse: () => envelopeResponse({ userId: 502, emailSent: false }),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());

    fillIssueForm();
    submitIssueForm();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "비밀번호 재발송으로 복구",
      ),
    );
  });

  it("409(1409)면 이미 계정이 있는 이메일 안내가 뜨고 폼 값은 유지된다 (AC 9)", async () => {
    stubAdminAccounts({
      issueResponse: () => errorEnvelope(1409, "이미 계정이 있습니다", 409),
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("부산진구청")).toBeDefined());

    fillIssueForm();
    submitIssueForm();

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "이미 계정이 있는 이메일",
      ),
    );
    expect((screen.getByLabelText("기관명") as HTMLInputElement).value).toBe(
      "해운대구청",
    );
  });
});

describe("계정 운영 — 계정 목록·비밀번호 재발송 (AC 10)", () => {
  const MIXED_ACCOUNTS = orgAccountList({
    accounts: [
      orgAccountItem({ userId: 501, orgName: "부산진구청", mustChange: false }),
      orgAccountItem({
        userId: 502,
        orgName: null,
        email: "culture@haeundae.go.kr",
        mustChange: true,
      }),
    ],
  });

  const openResendDialog = async () => {
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "비밀번호 재발송" }),
      ).toBeDefined(),
    );
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재발송" }));
  };

  it("행마다 기관명(폴백)·이메일·상태가 보이고 초기 로그인 전 행에만 재발송 버튼이 있다 (AC 10)", async () => {
    stubAdminAccounts({ accounts: MIXED_ACCOUNTS });

    renderPage();

    await waitFor(() => expect(screen.getByText("사용 중")).toBeDefined());
    expect(screen.getByText("초기 로그인 전")).toBeDefined();
    expect(screen.getByText("기관명 미등록")).toBeDefined();
    expect(screen.getByText("culture@haeundae.go.kr")).toBeDefined();
    // 사용 중 행에는 버튼이 없다 — 1423 예방 (스펙 추정 3)
    expect(
      screen.getAllByRole("button", { name: "비밀번호 재발송" }),
    ).toHaveLength(1);
  });

  it("재발송은 재발급 고지가 담긴 확인 단계를 거쳐 발사된다 (AC 10 · 추정 11)", async () => {
    const received = stubAdminAccounts({ accounts: MIXED_ACCOUNTS });
    renderPage();

    await openResendDialog();

    expect(screen.getByText(/이전 초기 비밀번호는 즉시 무효/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "재발송 확정" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "이전 비밀번호는 무효",
      ),
    );
    expect(
      received.some(({ request }) =>
        request.url.endsWith("/api/admin/organizations/502/resend-password"),
      ),
    ).toBe(true);
    expect(screenText()).not.toContain(LEAKED_PASSWORD);
  });

  it("409(1423)면 이미 비밀번호를 변경한 계정 안내가 보인다 (AC 10)", async () => {
    stubAdminAccounts({
      accounts: MIXED_ACCOUNTS,
      resendResponse: () => errorEnvelope(1423, "이미 변경했습니다", 409),
    });
    renderPage();

    await openResendDialog();
    fireEvent.click(screen.getByRole("button", { name: "재발송 확정" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "이미 비밀번호를 변경한 계정",
      ),
    );
  });
});

describe("계정 운영 — 발급 요청 큐 (AC 11·12)", () => {
  const openQueue = async () => {
    openTab("발급 요청");
    await waitFor(() => expect(screen.getByText("해운대구청")).toBeDefined());
  };

  it("헤더·상태 pill 3종(실 counts)·테이블이 렌더되고 요청일은 마지막 접수(updatedAt)다 (AC 11)", async () => {
    stubAdminAccounts();
    renderPage();

    await openQueue();

    expect(screen.getByRole("tab", { name: "대기 3" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "발급됨 12" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "반려 1" })).toBeDefined();
    const row = screen.getByRole("row", { name: /해운대구청/ });
    expect(row.textContent).toContain("2026 부산 바다축제");
    // updatedAt 04:24 UTC = KST 13:24 (최초 접수 01:00 UTC = KST 10:00은 표시하지 않는다)
    expect(row.textContent).toContain("13:24");
    expect(row.textContent).not.toContain("10:00");
  });

  it("첫 행이 자동 선택돼 상세가 채워지고 PENDING이면 처리 버튼과 각주가 보인다 (AC 11)", async () => {
    stubAdminAccounts();
    renderPage();

    await openQueue();

    await waitFor(() =>
      expect(screen.getByText(/해운대 해수욕장 일대 축제/)).toBeDefined(),
    );
    expect(screen.getByText(/051-749-4062/)).toBeDefined();
    expect(screen.getByRole("button", { name: "계정 발급" })).toBeDefined();
    expect(screen.getByRole("button", { name: "반려" })).toBeDefined();
    expect(
      screen.getByText(/발급 시 공식 이메일로 초기 비밀번호가 발송됩니다/),
    ).toBeDefined();
  });

  it("처리된 요청은 처리 버튼 대신 처리 결과와 반려 사유를 보여 준다 (AC 11 · 추정 13)", async () => {
    stubAdminAccounts({
      requests: accountRequestList({
        requests: [accountRequestItem({ status: "REJECTED" })],
      }),
      requestDetail: accountRequestDetail({
        status: "REJECTED",
        rejectReason: "공문이 첨부되지 않았습니다",
        processedAt: "2026-09-02T06:00:00.000Z",
      }),
    });
    renderPage();

    await openQueue();

    await waitFor(() =>
      expect(screen.getByText(/공문이 첨부되지 않았습니다/)).toBeDefined(),
    );
    expect(screen.queryByRole("button", { name: "계정 발급" })).toBeNull();
    expect(screen.queryByRole("button", { name: "반려" })).toBeNull();
  });

  it("승인 확정은 상세의 updatedAt을 에코해 발사되고 발송 안내가 뜬다 (AC 12)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await openQueue();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계정 발급" })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole("button", { name: "계정 발급" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "초기 비밀번호를 공식 이메일로 발송",
      ),
    );
    const approveCall = received.find(({ request }) =>
      request.url.endsWith("/approve"),
    );
    expect(approveCall?.body).toEqual({
      updatedAt: "2026-09-02T04:24:00.000Z",
    });
    expect(screenText()).not.toContain(LEAKED_PASSWORD);
  });

  it("반려는 사유 필수 모달을 거쳐 사유+updatedAt으로 발사된다 (AC 12)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await openQueue();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "반려" })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole("button", { name: "반려" }));

    expect(
      screen
        .getByRole("button", { name: "반려 확정" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByText(/메일로 발송되지 않으며/)).toBeDefined();
    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "공문 확인 불가" },
    });
    fireEvent.click(screen.getByRole("button", { name: "반려 확정" }));

    await waitFor(() => {
      const rejectCall = received.find(({ request }) =>
        request.url.endsWith("/reject"),
      );
      expect(rejectCall?.body).toEqual({
        reason: "공문 확인 불가",
        updatedAt: "2026-09-02T04:24:00.000Z",
      });
    });
  });

  it("반려 모달이 열린 뒤 목록이 갈아타도 열 때 보던 요청에만 반려가 나간다 (codex P1)", async () => {
    // 선택 id는 `pinnedId ?? 첫 행` 파생이라, 모달이 열린 동안 첫 행이 바뀌면
    // (다른 관리자가 41을 처리 → 목록에서 사라짐) 상세가 42로 갈아탄다.
    // 확정 시점에 상세를 읽으면 42를 반려하게 된다 — 대상 동결이 이를 막는다.
    let firstRowProcessed = false;
    const rejected: { url: string; body: unknown }[] = [];

    stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith("/reject")) {
        rejected.push({ url: request.url, body: await request.json() });
        return envelopeResponse(null);
      }
      const detailId = /org-account-requests\/(\d+)$/.exec(pathname)?.[1];
      if (detailId !== undefined) {
        const id = Number(detailId);
        return envelopeResponse(
          accountRequestDetail({
            id,
            orgName: `기관${id}`,
            updatedAt: `2026-09-02T0${id === 41 ? 4 : 5}:24:00.000Z`,
          }),
        );
      }
      if (pathname === "/api/admin/org-account-requests") {
        return envelopeResponse(
          accountRequestList({
            requests: firstRowProcessed
              ? [accountRequestItem({ id: 42, orgName: "기관42" })]
              : [
                  accountRequestItem({ id: 41, orgName: "기관41" }),
                  accountRequestItem({ id: 42, orgName: "기관42" }),
                ],
          }),
        );
      }
      return envelopeResponse(orgAccountList());
    });

    const { queryClient } = renderPage();
    openTab("발급 요청");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "반려" })).toBeDefined(),
    );
    // 열 때의 상세가 41임을 확인한 뒤 모달을 연다
    await waitFor(() => expect(screenText()).toContain("기관41"));
    fireEvent.click(screen.getByRole("button", { name: "반려" }));

    // 모달이 열린 채 백그라운드 재조회 — 41이 목록에서 사라져 선택이 42로 갈아탄다
    firstRowProcessed = true;
    await queryClient.invalidateQueries();
    await waitFor(() => expect(screenText()).toContain("기관42"));

    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "공문 확인 불가" },
    });
    fireEvent.click(screen.getByRole("button", { name: "반려 확정" }));

    await waitFor(() => expect(rejected).toHaveLength(1));
    // 동결된 41로 나가야 한다 — 42로 나가면 엉뚱한 요청을 반려한 것이다
    expect(rejected[0].url).toContain("/org-account-requests/41/reject");
    expect(rejected[0].body).toEqual({
      reason: "공문 확인 불가",
      updatedAt: "2026-09-02T04:24:00.000Z",
    });
  });

  it("409(1422 이미 처리)와 409(1426 검토 이후 변경)가 다른 안내로 갈린다 (AC 12)", async () => {
    stubAdminAccounts({
      approveResponse: () => errorEnvelope(1422, "이미 처리됨", 409),
    });
    renderPage();
    await openQueue();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계정 발급" })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole("button", { name: "계정 발급" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "이미 처리된 요청",
      ),
    );

    cleanup();
    vi.unstubAllGlobals();
    stubAdminAccounts({
      approveResponse: () => errorEnvelope(1426, "검토 이후 변경", 409),
    });
    renderPage();
    await openQueue();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계정 발급" })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole("button", { name: "계정 발급" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("검토 이후"),
    );
  });
});

describe("계정 운영 — 아이디 변경 큐 (AC 13)", () => {
  const openEmailQueue = async () => {
    openTab("아이디 변경");
    // 첫 행이 자동 선택되며 같은 이메일이 카드에도 나타나므로 행으로 기다린다
    await waitFor(() =>
      expect(screen.getByRole("row", { name: /부산진구청/ })).toBeDefined(),
    );
  };

  it("현재 아이디와 바꾸려는 이메일이 나란히 대조되고 요청일은 createdAt이다 (AC 13)", async () => {
    stubAdminAccounts();
    renderPage();

    await openEmailQueue();

    const row = screen.getByRole("row", { name: /부산진구청/ });
    expect(row.textContent).toContain("tourism@busanjin.go.kr");
    expect(row.textContent).toContain("culture@busanjin.go.kr");
    // createdAt 05:31 UTC = KST 14:31
    expect(row.textContent).toContain("14:31");
    expect(screen.getByRole("tab", { name: "대기 2" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "승인됨 8" })).toBeDefined();
  });

  it("승인은 목록의 createdAt을 requestedAt으로 에코하고 교체·통지 안내가 뜬다 (AC 13)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await openEmailQueue();

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("통지"),
    );
    const approveCall = received.find(({ request }) =>
      request.url.endsWith("/approve"),
    );
    expect(approveCall?.body).toEqual({
      requestedAt: "2026-09-02T05:31:00.000Z",
    });
  });

  it("통지 발송이 실패해도 교체 유지 안내가 뜬다 (AC 2d·13)", async () => {
    stubAdminAccounts({
      emailApproveResponse: () =>
        envelopeResponse({
          requestId: 91,
          email: "culture@busanjin.go.kr",
          emailSent: false,
        }),
    });
    renderPage();
    await openEmailQueue();

    fireEvent.click(screen.getByRole("button", { name: "승인" }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("교체는 유지"),
    );
  });

  it("반려는 사유 필수 모달을 거쳐 사유+requestedAt으로 발사된다 (AC 13)", async () => {
    const received = stubAdminAccounts();
    renderPage();
    await openEmailQueue();

    fireEvent.click(screen.getByRole("button", { name: "반려" }));
    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "기관 도메인이 아님" },
    });
    fireEvent.click(screen.getByRole("button", { name: "반려 확정" }));

    await waitFor(() => {
      const rejectCall = received.find(({ request }) =>
        request.url.endsWith("/reject"),
      );
      expect(rejectCall?.body).toEqual({
        reason: "기관 도메인이 아님",
        requestedAt: "2026-09-02T05:31:00.000Z",
      });
    });
  });
});

describe("계정 운영 — 로딩·빈 상태·실패 (AC 14)", () => {
  it("계정 목록이 비면 빈 상태 안내가 보인다 (AC 14)", async () => {
    stubAdminAccounts({ accounts: orgAccountList({ accounts: [] }) });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/발급된 계정이 없습니다/)).toBeDefined(),
    );
  });

  it("계정 목록 조회가 실패하면 재시도 안내가 보인다 (AC 14)", async () => {
    stubFetch(async () => errorEnvelope(1400, "서버 오류", 500));

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined(),
    );
  });

  it("대기 요청이 없으면 목록 빈 안내와 미선택 카드가 함께 보인다 (AC 14)", async () => {
    stubAdminAccounts({
      requests: accountRequestList({ requests: [], pendingCount: 0 }),
    });
    renderPage();

    openTab("발급 요청");

    await waitFor(() =>
      expect(screen.getByText(/대기 중인 요청이 없습니다/)).toBeDefined(),
    );
    expect(screen.getByText(/행을 선택하면/)).toBeDefined();
  });

  it("아이디 변경 목록이 비면 빈 상태 안내가 보인다 (AC 14)", async () => {
    stubAdminAccounts({
      emailChanges: emailChangeList({ requests: [], pendingCount: 0 }),
    });
    renderPage();

    openTab("아이디 변경");

    await waitFor(() =>
      expect(screen.getByText(/대기 중인 요청이 없습니다/)).toBeDefined(),
    );
  });
});
