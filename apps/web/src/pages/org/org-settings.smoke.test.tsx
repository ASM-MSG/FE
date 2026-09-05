import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { OrgSettingsPage } from "./OrgSettingsPage";

/**
 * 계정 설정 화면 흐름 스모크 (MSG-544 AC 1·2·3·4·5·7·8·9) — 세 흐름의 협업 계약을
 * 고정한다: 담당자 저장(선검증·성공·실패), 비밀번호 변경 뷰 전환·복귀, 이메일 변경 요청 →
 * 승인 대기 안내 → 재요청. 정책 경계값과 mutation 캐시 계약은 로직 테스트가 담당한다.
 */
const PROFILE = {
  email: "tourism@busan.go.kr",
  contactName: "김민지 주무관",
  contactPhone: "051-888-0000",
};

interface SettingsStubs {
  profile?: () => Response;
  updateProfile?: () => Response;
  changePassword?: () => Response;
  emailChange?: () => Response;
}

const setupFetch = (stubs: SettingsStubs = {}): ReceivedRequest[] =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/org/profile") {
      return request.method === "PATCH"
        ? (stubs.updateProfile?.() ?? envelopeResponse(PROFILE))
        : (stubs.profile?.() ?? envelopeResponse(PROFILE));
    }
    if (pathname === "/api/auth/password/change") {
      return stubs.changePassword?.() ?? envelopeResponse(null);
    }
    if (pathname === "/api/org/email-change-request") {
      return stubs.emailChange?.() ?? envelopeResponse(null);
    }
    return envelopeResponse({ mustChange: false });
  });

const requestsTo = (
  received: ReceivedRequest[],
  pathname: string,
  method?: string,
) =>
  received.filter(
    ({ request }) =>
      new URL(request.url).pathname === pathname &&
      (method === undefined || request.method === method),
  );

const saveContact = (contactName: string, contactPhone: string) => {
  fireEvent.change(screen.getByLabelText("담당자"), {
    target: { value: contactName },
  });
  fireEvent.change(screen.getByLabelText("연락처"), {
    target: { value: contactPhone },
  });
  fireEvent.click(screen.getByRole("button", { name: "변경 내용 저장" }));
};

const requestEmailChange = async (requestedEmail: string) => {
  fireEvent.click(screen.getByRole("button", { name: "이메일 변경 요청" }));
  fireEvent.change(await screen.findByLabelText("새 공식 이메일"), {
    target: { value: requestedEmail },
  });
  fireEvent.click(screen.getByRole("button", { name: "변경 요청 보내기" }));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("계정 설정 화면 렌더 (AC 1)", () => {
  it("제목·읽기 전용 이메일·담당자 폼·문의 각주가 프로필 값으로 렌더된다 (AC 1)", async () => {
    signInForTest();
    setupFetch();

    renderWithProviders(<OrgSettingsPage />);

    expect(
      screen.getByRole("heading", { name: "계정 설정", level: 1 }),
    ).toBeDefined();
    expect(
      await screen.findByDisplayValue("tourism@busan.go.kr"),
    ).toBeDefined();
    expect(screen.getByLabelText("공식 이메일 (아이디)")).toHaveProperty(
      "readOnly",
      true,
    );
    expect(screen.getByLabelText("담당자")).toHaveProperty(
      "value",
      "김민지 주무관",
    );
    expect(screen.getByLabelText("연락처")).toHaveProperty(
      "value",
      "051-888-0000",
    );
    expect(
      screen.getByText(/계정 관련 문의는 운영팀 support@fillmap.kr/),
    ).toBeDefined();
  });

  it("연락처가 null인 계정은 빈 입력으로 시작한다 (AC 1)", async () => {
    signInForTest();
    setupFetch({
      profile: () => envelopeResponse({ ...PROFILE, contactPhone: null }),
    });

    renderWithProviders(<OrgSettingsPage />);

    expect(await screen.findByLabelText("연락처")).toHaveProperty("value", "");
  });
});

describe("프로필 조회 실패·재시도 (AC 2)", () => {
  it("실패하면 재시도 안내가 뜨고 재시도 클릭으로 화면이 복구된다 (AC 2)", async () => {
    signInForTest();
    let attempt = 0;
    setupFetch({
      profile: () => {
        attempt += 1;
        return attempt === 1
          ? errorEnvelope(1500, "서버 오류", 500)
          : envelopeResponse(PROFILE);
      },
    });

    renderWithProviders(<OrgSettingsPage />);

    expect(
      await screen.findByText("계정 정보를 불러오지 못했어요"),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByLabelText("담당자")).toBeDefined();
  });
});

describe("담당자 정보 저장 (AC 3·4)", () => {
  it("이름이 2~20자를 벗어나면 저장 요청이 나가지 않고 규칙이 안내된다 (AC 3)", async () => {
    signInForTest();
    const received = setupFetch();
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    saveContact("김", "051-888-0000");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "담당자 이름은 2~20자",
    );
    expect(requestsTo(received, "/api/org/profile", "PATCH")).toHaveLength(0);
  });

  it("연락처가 형식을 벗어나면 저장 요청이 나가지 않고 규칙이 안내된다 (AC 3)", async () => {
    signInForTest();
    const received = setupFetch();
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    saveContact("김민지 주무관", "051-888");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "숫자로 시작·끝나는 숫자와 하이픈 9~20자",
    );
    expect(requestsTo(received, "/api/org/profile", "PATCH")).toHaveLength(0);
  });

  it("유효한 값을 저장하면 완료 안내가 보인다 (AC 4)", async () => {
    signInForTest();
    const received = setupFetch({
      updateProfile: () =>
        envelopeResponse({ ...PROFILE, contactName: "박서준 주무관" }),
    });
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    saveContact("박서준 주무관", "051-888-0000");

    expect(await screen.findByText("담당자 정보를 저장했습니다")).toBeDefined();
    expect(requestsTo(received, "/api/org/profile", "PATCH")).toHaveLength(1);
  });

  it("저장 실패는 서버 message로 안내되고 재제출할 수 있다 (AC 4)", async () => {
    signInForTest();
    const received = setupFetch({
      updateProfile: () => errorEnvelope(1400, "연락처를 확인해주세요", 400),
    });
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    saveContact("김민지 주무관", "051-888-0000");

    expect(await screen.findByText("연락처를 확인해주세요")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "변경 내용 저장" }));

    await waitFor(() =>
      expect(requestsTo(received, "/api/org/profile", "PATCH")).toHaveLength(2),
    );
  });
});

describe("비밀번호 변경 뷰 (AC 5·6·7)", () => {
  const openPasswordView = async () => {
    renderWithProviders(<OrgSettingsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "비밀번호 변경" }),
    );
  };

  const submitPasswordChange = (
    currentPassword: string,
    password: string,
    confirmation: string,
  ) => {
    fireEvent.change(screen.getByLabelText("현재 비밀번호"), {
      target: { value: currentPassword },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호"), {
      target: { value: password },
    });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), {
      target: { value: confirmation },
    });
    fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경하기" }));
  };

  it("'비밀번호 변경' 클릭 시 비밀번호 변경 뷰로 전환되고 계정 설정 복귀 경로가 있다 (AC 5)", async () => {
    signInForTest();
    setupFetch();

    await openPasswordView();

    expect(
      await screen.findByRole("heading", {
        name: "비밀번호를 변경하세요",
        level: 1,
      }),
    ).toBeDefined();
    expect(screen.getByText("계정 보안")).toBeDefined();
    expect(screen.getByLabelText("현재 비밀번호")).toBeDefined();
    expect(screen.getByText("영문과 숫자 각 1자 이상, 8~64자")).toBeDefined();
    expect(screen.getByText("안전한 비밀번호 팁")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "‹ 계정 설정" }));

    expect(
      screen.getByRole("heading", { name: "계정 설정", level: 1 }),
    ).toBeDefined();
  });

  it("현재 비밀번호가 비어 있으면 요청이 나가지 않고 안내된다 (AC 6)", async () => {
    signInForTest();
    const received = setupFetch();
    await openPasswordView();
    await screen.findByLabelText("현재 비밀번호");

    submitPasswordChange("", "fillmap12", "fillmap12");

    expect(
      await screen.findByText("현재 비밀번호를 입력해주세요"),
    ).toBeDefined();
    expect(requestsTo(received, "/api/auth/password/change")).toHaveLength(0);
  });

  it("새 비밀번호가 정책을 어기거나 확인과 다르면 요청이 나가지 않고 안내된다 (AC 6)", async () => {
    signInForTest();
    const received = setupFetch();
    await openPasswordView();
    await screen.findByLabelText("현재 비밀번호");

    submitPasswordChange("oldpass12", "short1", "short1");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "영문과 숫자 각 1자 이상, 8~64자",
    );

    submitPasswordChange("oldpass12", "fillmap12", "fillmap13");

    expect(
      await screen.findByText("비밀번호 확인이 일치하지 않습니다"),
    ).toBeDefined();
    expect(requestsTo(received, "/api/auth/password/change")).toHaveLength(0);
  });

  it("변경 성공 시 완료 안내와 함께 계정 설정 뷰로 복귀한다 (AC 7)", async () => {
    signInForTest();
    setupFetch();
    await openPasswordView();
    await screen.findByLabelText("현재 비밀번호");

    submitPasswordChange("oldpass12", "fillmap12", "fillmap12");

    expect(await screen.findByText("비밀번호를 변경했습니다")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "계정 설정", level: 1 }),
    ).toBeDefined();
  });

  it("현재 비밀번호 불일치는 뷰를 떠나지 않고 서버 message로 안내되며 재제출할 수 있다 (AC 7)", async () => {
    signInForTest();
    const received = setupFetch({
      changePassword: () =>
        errorEnvelope(1400, "현재 비밀번호가 일치하지 않습니다", 400),
    });
    await openPasswordView();
    await screen.findByLabelText("현재 비밀번호");

    submitPasswordChange("wrongpass1", "fillmap12", "fillmap12");

    expect(
      await screen.findByText("현재 비밀번호가 일치하지 않습니다"),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: "비밀번호를 변경하세요",
        level: 1,
      }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경하기" }));

    await waitFor(() =>
      expect(requestsTo(received, "/api/auth/password/change")).toHaveLength(2),
    );
  });
});

describe("아이디(공식 이메일) 변경 요청 (AC 8·9)", () => {
  it("이메일 형식이 아니면 요청이 나가지 않고 안내된다 (AC 8)", async () => {
    signInForTest();
    const received = setupFetch();
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    await requestEmailChange("not-an-email");

    expect(
      await screen.findByText("이메일 형식으로 입력해주세요"),
    ).toBeDefined();
    expect(requestsTo(received, "/api/org/email-change-request")).toHaveLength(
      0,
    );
  });

  it("접수 성공 시 승인 대기 안내가 요청 이메일과 함께 표시된다 (AC 8)", async () => {
    signInForTest();
    setupFetch();
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    await requestEmailChange("new@busan.go.kr");

    expect(await screen.findByText("관리자 승인 대기")).toBeDefined();
    expect(screen.getByText(/new@busan\.go\.kr/)).toBeDefined();
  });

  it("승인 대기 중에도 재요청이 가능하고 안내가 새 이메일로 갱신된다 (AC 9)", async () => {
    signInForTest();
    const received = setupFetch();
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");
    await requestEmailChange("first@busan.go.kr");
    await screen.findByText("관리자 승인 대기");

    await requestEmailChange("second@busan.go.kr");

    expect(await screen.findByText(/second@busan\.go\.kr/)).toBeDefined();
    expect(screen.queryByText(/first@busan\.go\.kr/)).toBeNull();
    expect(requestsTo(received, "/api/org/email-change-request")).toHaveLength(
      2,
    );
  });

  it("접수 실패는 안내되고 모달을 떠나지 않아 재제출할 수 있다 (AC 8)", async () => {
    signInForTest();
    const received = setupFetch({
      emailChange: () =>
        errorEnvelope(1400, "이미 사용 중인 이메일입니다", 400),
    });
    renderWithProviders(<OrgSettingsPage />);
    await screen.findByLabelText("담당자");

    await requestEmailChange("taken@busan.go.kr");

    expect(
      await screen.findByText("이미 사용 중인 이메일입니다"),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "변경 요청 보내기" }));

    await waitFor(() =>
      expect(
        requestsTo(received, "/api/org/email-change-request"),
      ).toHaveLength(2),
    );
  });
});
