import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { redirectTo } from "@/shared/navigation";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { OrgAccountRequestPage } from "./OrgAccountRequestPage";

// 하드 이동은 어댑터 경유 — jsdom이 location.assign 재정의를 막는다 (route-error-boundary 관례)
vi.mock("@/shared/navigation", () => ({ redirectTo: vi.fn() }));

/**
 * 계정 발급 요청 흐름 스모크 (MSG-543 AC 1·2·3·4·5·6) — 폼 렌더 → 선검증 차단 →
 * 제출 성공 시 같은 라우트 안에서의 완료 화면 전환 → 실패 안내 → 홈 복귀를
 * 실제 조립(폼 + 생성 mutation + 라우터)으로 고정한다.
 */
const VALUES = {
  기관명: "부산진구청",
  담당자명: "김담당",
  연락처: "010-1234-5678",
  "공식 이메일": "event@busanjin.go.kr",
  "예정 행사명": "서면 겨울 축제",
  "요청 내용": "서면 겨울 축제 운영을 위해 계정이 필요합니다.",
} as const;

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: CONSOLE_ROUTES.orgAccountRequest,
              element: <OrgAccountRequestPage />,
            },
            { path: CONSOLE_ROUTES.orgLogin, element: <h1>로그인</h1> },
          ],
          { initialEntries: [CONSOLE_ROUTES.orgAccountRequest] },
        )}
      />
    </QueryClientProvider>,
  );

const fillForm = (overrides: Partial<Record<string, string>> = {}) => {
  for (const [label, value] of Object.entries({ ...VALUES, ...overrides })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  fireEvent.click(
    screen.getByLabelText(
      "발급 및 운영 안내를 위해 입력한 정보를 운영팀이 확인하는 것에 동의합니다.",
    ),
  );
};

const submit = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "관리자에게 계정 발급 요청" }),
  );

const acceptedFetch = (): ReceivedRequest[] =>
  stubFetch(() => envelopeResponse(null));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(redirectTo).mockClear();
});

describe("계정 발급 요청 폼 화면 (AC 1)", () => {
  it("좌측 절차 안내·백링크·제목·6필드·동의·제출·문의가 렌더된다 (AC 1)", () => {
    renderPage();

    expect(screen.getByText("FILLMAP")).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: "행사 운영자 계정 발급 요청",
        level: 1,
      }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("link", { name: "‹ 행사 운영자 로그인" })
        .getAttribute("href"),
    ).toBe(CONSOLE_ROUTES.orgLogin);
    for (const label of Object.keys(VALUES)) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect(screen.getByText("정보 입력")).toBeDefined();
    expect(screen.getByText("운영팀 검토")).toBeDefined();
    expect(screen.getByText("계정 수신")).toBeDefined();
    expect(screen.getByText("계정 발급 안내")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "관리자에게 계정 발급 요청" }),
    ).toBeDefined();
    expect(screen.getByText("문의 contact@fillmap.kr")).toBeDefined();
  });

  it("문서 제목이 '{화면 제목} | 필맵' 관례를 따른다 (AC 1)", () => {
    renderPage();

    expect(document.title).toBe("행사 운영자 계정 발급 요청 | 필맵");
  });
});

describe("계정 발급 요청 선검증 (AC 2)", () => {
  it("빈 폼으로 제출하면 요청이 나가지 않고 필드마다 사유가 안내된다 (AC 2)", () => {
    const received = acceptedFetch();
    renderPage();

    submit();

    expect(received).toHaveLength(0);
    expect(screen.getByText("기관명을 입력해주세요")).toBeDefined();
    expect(screen.getByText("담당자명을 2~20자로 입력해주세요")).toBeDefined();
    expect(screen.getByText("연락처를 입력해주세요")).toBeDefined();
    expect(screen.getByText("공식 이메일을 입력해주세요")).toBeDefined();
    expect(screen.getByText("예정 행사명을 입력해주세요")).toBeDefined();
    expect(screen.getByText("요청 내용을 입력해주세요")).toBeDefined();
  });

  it("형식이 어긋난 연락처는 제출되지 않고 패턴 사유가 안내된다 (AC 2)", () => {
    const received = acceptedFetch();
    renderPage();
    fillForm({ 연락처: "010 1234 5678" });

    submit();

    expect(received).toHaveLength(0);
    expect(
      screen.getByText("연락처는 숫자와 하이픈만 사용해 9~20자로 입력해주세요"),
    ).toBeDefined();
  });

  it("동의하지 않으면 제출되지 않고 동의 사유가 안내된다 (AC 2·추정 3)", () => {
    const received = acceptedFetch();
    renderPage();
    fillForm();
    // 동의를 다시 눌러 해제한다
    fireEvent.click(
      screen.getByLabelText(
        "발급 및 운영 안내를 위해 입력한 정보를 운영팀이 확인하는 것에 동의합니다.",
      ),
    );

    submit();

    expect(received).toHaveLength(0);
    expect(
      screen.getByText("입력한 정보 확인에 동의해야 요청할 수 있습니다"),
    ).toBeDefined();
  });

  it("오류가 뜬 필드를 고치면 재제출 전에 그 필드 오류만 즉시 사라진다 (AC 2 · codex 리뷰)", () => {
    // 선검증 실패 후 값을 고쳐도 다음 submit까지 오류·aria-invalid가 남아 있으면
    // 필드 7개 폼에서 이미 해결한 안내가 계속 사용자를 잡는다 — 고친 필드만 지운다.
    acceptedFetch();
    renderPage();

    submit();

    expect(screen.getByText("기관명을 입력해주세요")).toBeDefined();
    fireEvent.change(screen.getByLabelText("기관명"), {
      target: { value: "부산진구청" },
    });
    expect(screen.queryByText("기관명을 입력해주세요")).toBeNull();
    expect(
      screen.getByLabelText("기관명").getAttribute("aria-invalid"),
    ).toBeNull();
    expect(screen.getByText("담당자명을 2~20자로 입력해주세요")).toBeDefined();
  });

  it("무효한 값으로 고치면 오류가 걷히지 않고 현재 사유로 갱신된다 (AC 2 · codex P2)", () => {
    // 편집만으로 오류를 지우면 무효→무효 편집(예: 여전히 짧은 담당자명)이
    // 다음 submit까지 "해결됨"으로 보인다 — 걷는 조건은 편집이 아니라 유효다.
    acceptedFetch();
    renderPage();

    submit();

    fireEvent.change(screen.getByLabelText("담당자명"), {
      target: { value: "김" },
    });
    expect(screen.getByText("담당자명을 2~20자로 입력해주세요")).toBeDefined();
    expect(screen.getByLabelText("담당자명").getAttribute("aria-invalid")).toBe(
      "true",
    );

    // 사유가 바뀌는 편집은 문구도 현재 값 기준으로 갱신된다 (필수 → 패턴)
    fireEvent.change(screen.getByLabelText("연락처"), {
      target: { value: "010 1234 5678" },
    });
    expect(
      screen.getByText("연락처는 숫자와 하이픈만 사용해 9~20자로 입력해주세요"),
    ).toBeDefined();
    expect(screen.queryByText("연락처를 입력해주세요")).toBeNull();
  });

  it("동의 오류는 체크박스에 프로그램적으로 연결된다 (AC 2 · codex P2)", () => {
    // 텍스트 6필드와 달리 동의 체크박스는 문구만 렌더돼 스크린리더가 "이 컨트롤이
    // 무효이고 옆 문구가 그 사유"라는 것을 알 수 없었다 — 오류 표출이 곧 접근성
    // 계약이라 aria-invalid + aria-describedby를 컨트롤에 싣는다.
    acceptedFetch();
    renderPage();
    fillForm();
    fireEvent.click(
      screen.getByLabelText(
        "발급 및 운영 안내를 위해 입력한 정보를 운영팀이 확인하는 것에 동의합니다.",
      ),
    );

    submit();

    const consent = screen.getByRole("checkbox");
    expect(consent.getAttribute("aria-invalid")).toBe("true");
    expect(consent.getAttribute("aria-describedby")).toBe(
      "account-request-consent-error",
    );
    expect(
      document.getElementById("account-request-consent-error")?.textContent,
    ).toBe("입력한 정보 확인에 동의해야 요청할 수 있습니다");
  });
});

describe("계정 발급 요청 제출 (AC 3·5)", () => {
  it("유효 제출 시 DTO 6필드가 계정 발급 요청 엔드포인트로 나간다 (AC 3)", async () => {
    const received = acceptedFetch();
    renderPage();
    fillForm();

    submit();

    await waitFor(() => expect(received).toHaveLength(1));
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/org-account-requests",
    );
    expect(received[0].body).toEqual({
      orgName: "부산진구청",
      contactName: "김담당",
      contactPhone: "010-1234-5678",
      email: "event@busanjin.go.kr",
      eventName: "서면 겨울 축제",
      content: "서면 겨울 축제 운영을 위해 계정이 필요합니다.",
    });
  });

  it("제출 중에는 버튼이 진행 상태로 잠겨 재제출이 차단된다 (AC 3)", async () => {
    const received = stubFetch(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(envelopeResponse(null)), 50);
        }),
    );
    renderPage();
    fillForm();

    submit();

    const pendingButton = await screen.findByRole("button", {
      name: "요청 중…",
    });
    fireEvent.click(pendingButton);
    expect(received).toHaveLength(1);
  });

  it("제출 성공 시 라우트를 바꾸지 않고 완료 화면으로 전환된다 (AC 5)", async () => {
    acceptedFetch();
    renderPage();
    fillForm();

    submit();

    expect(
      await screen.findByRole("heading", {
        name: "계정 발급 요청 완료",
        level: 1,
      }),
    ).toBeDefined();
    expect(screen.getByText("요청이 접수되었습니다")).toBeDefined();
    expect(screen.getByText("검토 대기")).toBeDefined();
    expect(document.title).toBe("계정 발급 요청 완료 | 필맵");
  });

  it("완료 화면의 요약은 제출한 기관·공식 이메일·예정 행사 값을 보인다 (AC 5)", async () => {
    acceptedFetch();
    renderPage();
    fillForm({ 기관명: "부산광역시 관광마이스과" });

    submit();

    await screen.findByRole("heading", { name: "계정 발급 요청 완료" });
    expect(screen.getByText("부산광역시 관광마이스과")).toBeDefined();
    expect(screen.getByText("event@busanjin.go.kr")).toBeDefined();
    expect(screen.getByText("서면 겨울 축제")).toBeDefined();
  });

  it("요약의 긴 값(제약 상한 이메일)은 카드 밖으로 넘치지 않고 줄바꿈된다 (AC 5 · codex P2)", async () => {
    // 서버 DTO는 255자 이메일을 허용한다 — 공백 없는 최대 길이 값이 요약에 들어와도
    // 카드를 밀어내면 안 된다. flex 자식의 기본 `min-width: auto`는 줄바꿈을 막으므로
    // 값 셀은 `min-w-0`과 단어 분해 규칙을 함께 가져야 한다(jsdom은 레이아웃이 없어
    // 클래스 계약으로 판정한다 — 실제 렌더는 브라우저 검증 몫).
    const longEmail = `${"a".repeat(240)}@busanjin.go.kr`;
    expect(longEmail).toHaveLength(255);

    acceptedFetch();
    renderPage();
    fillForm({ "공식 이메일": longEmail });

    submit();

    await screen.findByRole("heading", { name: "계정 발급 요청 완료" });
    const valueCell = screen.getByText(longEmail);
    expect(valueCell.className).toContain("min-w-0");
    expect(valueCell.className).toMatch(/break-words|break-all|wrap-anywhere/);
  });

  it("완료 화면에서 좌측 안내가 접수 문구로 바뀌고 2단계가 활성이 된다 (AC 5)", async () => {
    acceptedFetch();
    renderPage();
    fillForm();

    submit();

    await screen.findByRole("heading", { name: "계정 발급 요청 완료" });
    // 좌측 헤드라인은 브랜딩 문구라 헤딩이 아니다 — h1(본문 제목)보다 먼저 오는
    // h2를 만들지 않는다 (codex 리뷰 — 스크린리더 헤딩 아웃라인)
    expect(screen.getByText(/요청이 접수되어/)).toBeDefined();
    expect(
      screen.queryByRole("heading", { name: /요청이 접수되어/ }),
    ).toBeNull();
    expect(
      screen.getByRole("listitem", { current: "step" }).textContent,
    ).toContain("운영팀 검토");
  });
});

describe("계정 발급 요청 실패 안내 (AC 4)", () => {
  it("서버가 거절하면 폼을 떠나지 않고 봉투 message가 안내된다 (AC 4)", async () => {
    stubFetch(() => errorEnvelope(14400, "요청 내용을 확인해주세요", 400));
    renderPage();
    fillForm();

    submit();

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByText("요청 내용을 확인해주세요")).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: "행사 운영자 계정 발급 요청",
        level: 1,
      }),
    ).toBeDefined();
  });

  it("응답이 없는 실패는 네트워크 문구로 안내되고 입력값 보존 상태로 재제출된다 (AC 4)", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        attempts += 1;
        throw new TypeError("Failed to fetch");
      }),
    );
    renderPage();
    fillForm();

    submit();

    expect(
      await screen.findByText(/네트워크 상태를 확인해주세요/),
    ).toBeDefined();
    expect(screen.getByLabelText("기관명").getAttribute("value")).toBe(
      "부산진구청",
    );

    submit();

    await waitFor(() => expect(attempts).toBeGreaterThan(1));
  });
});

describe("완료 화면의 홈 복귀 (AC 6)", () => {
  it("'필맵 홈으로 돌아가기'를 누르면 필맵 루트로 하드 이동한다 (AC 6·추정 2)", async () => {
    acceptedFetch();
    renderPage();
    fillForm();

    submit();

    fireEvent.click(
      await screen.findByRole("button", { name: "필맵 홈으로 돌아가기" }),
    );
    expect(vi.mocked(redirectTo)).toHaveBeenCalledWith("/");
  });
});
