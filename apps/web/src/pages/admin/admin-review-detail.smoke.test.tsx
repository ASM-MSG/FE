import { fireEvent, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import type { AdminEventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";
import { submissionDetail } from "@/test/admin-review-fixture";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { submissionHistory } from "@/test/org-submission-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { type ReceivedRequest, stubFetch } from "@/test/stub-fetch";
import { AdminReviewDetailPage } from "./AdminReviewDetailPage";

/**
 * 심사 상세 흐름 스모크 (MSG-553 AC 5·8·9·10·11·12·13) — 진입 렌더, 승인 확인 모달
 * 게이트, 반려 활성 조건, 성공 복귀, 실패 분기, 처리 완료 분기, 잘못된 id를 고정한다.
 *
 * 지도(`ReviewAreaMap`)는 jsdom에 SDK가 없어 폴백·로딩으로만 렌더된다 — 오버레이·
 * fitBounds·패닝 유지는 브라우저 실동작 검증 몫(AC 6·7)이고, 여기서는 지도 영역이
 * 자리 잡는 것까지만 본다. 표기 문자열의 세부는 순수 함수 테스트가 이미 단정한다.
 */
const SUBMISSION_ID = 1204;
const DETAIL_PATH = `/api/admin/event-submissions/${SUBMISSION_ID}`;

const IN_REVIEW = submissionDetail();
const APPROVED = submissionDetail({ status: "APPROVED" });
// 관리자 상세 DTO에는 `rejection` 필드가 없다(스펙 전제 오류 — 빌드 리포트 기록):
// 반려 항목·사유의 재료는 이력의 반려 행이다
const REJECTED = submissionDetail({
  status: "REJECTED",
  history: [
    submissionHistory({ changedAt: "2026-09-02T01:24:00Z" }),
    submissionHistory({
      status: "REJECTED",
      reasonCodes: ["PERIOD", "IMAGE"],
      reasonText: "행사 기간이 지났고 홍보 이미지가 흐립니다.",
      changedAt: "2026-09-03T05:00:00Z",
    }),
  ],
});

interface StubOptions {
  detail?: AdminEventSubmissionDetailResponseDto;
  /** 상세 조회를 실패시킨다 — [developCode, status] */
  detailError?: [number, number];
  /** 확정(승인·반려) 요청을 실패시킨다 — [developCode, status] */
  decisionError?: [number, number];
}

const reviewFetch = ({
  detail = IN_REVIEW,
  detailError,
  decisionError,
}: StubOptions) =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname.endsWith("/approve") || pathname.endsWith("/reject")) {
      return decisionError
        ? errorEnvelope(decisionError[0], "확정 실패", decisionError[1])
        : envelopeResponse({
            submissionId: SUBMISSION_ID,
            approvalNo: "APR-2026-0031",
            status: "APPROVED",
          });
    }
    if (pathname === DETAIL_PATH) {
      return detailError
        ? errorEnvelope(detailError[0], "조회 실패", detailError[1])
        : envelopeResponse(detail);
    }
    return errorEnvelope(9999, `unexpected request: ${pathname}`, 500);
  });

/** 심사 상세를 stub 응답과 함께 띄운다 — 성공 복귀 검증용 착지 라우트 동반 */
const renderDetail = (
  options: StubOptions = {},
  path = `/admin/review/${SUBMISSION_ID}`,
): ReceivedRequest[] => {
  const received = reviewFetch(options);
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.adminReviewDetail}
        element={<AdminReviewDetailPage />}
      />
      <Route path={CONSOLE_ROUTES.adminReview} element={<p>심사 큐 화면</p>} />
    </Routes>,
    path,
  );
  return received;
};

const decisionRequests = (received: ReceivedRequest[]) =>
  received.filter(({ request }) => request.method === "POST");

const approveButton = () =>
  screen.getByRole("button", { name: "승인·지도 노출" });
const rejectButton = () =>
  screen.getByRole("button", { name: "반려" }) as HTMLButtonElement;

/** 확인 모달 — DialogShell 중앙 배치(승인 확정), ModalCard가 dialog 역할을 갖는다 */
const confirmDialog = () =>
  screen.getByRole("dialog", { name: "이 행사를 승인할까요?" });

describe("관리자 심사 상세 (AC 5·8·9·10·11·12·13)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("진입하면 좌 패널에 제목·상태 칩·요약·반려 입력·확정 버튼·각주가, 우측에 지도 영역이 렌더된다 (AC 5)", async () => {
    renderDetail();

    expect(
      await screen.findByRole("heading", { name: "광안리 M 드론쇼" }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "행사 등록 심사", level: 1 }),
    ).toBeDefined();
    expect(screen.getByText("심사 중")).toBeDefined();
    expect(
      screen.getByText("부산시 관광마이스과 · 2026. 9. 5 – 9. 7"),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "‹ 심사 큐" })).toBeDefined();
    ["행사 기간", "위치 영역", "홍보 이미지", "행사 정보"].forEach((label) => {
      expect(screen.getByRole("checkbox", { name: label })).toBeDefined();
    });
    expect(screen.getByLabelText("반려 사유")).toBeDefined();
    expect(rejectButton()).toBeDefined();
    expect(approveButton()).toBeDefined();
    expect(
      screen.getByRole("region", { name: "심사 영역 지도" }),
    ).toBeDefined();
    expect(document.title).toBe("심사 상세 | 필맵");
  });

  it("'승인·지도 노출'은 확인 모달을 띄우고, 취소하면 승인이 발사되지 않는다 (AC 8)", async () => {
    const received = renderDetail();
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });

    fireEvent.click(approveButton());

    expect(
      within(confirmDialog()).getByText(
        "승인하면 기존 행사방 데이터가 생성되고 일반 유저 지도에 즉시 노출됩니다.",
      ),
    ).toBeDefined();

    fireEvent.click(
      within(confirmDialog()).getByRole("button", { name: "취소" }),
    );

    expect(decisionRequests(received)).toHaveLength(0);
  });

  it("모달에서 확정하면 승인이 발사되고 심사 큐로 복귀한다 (AC 8·10)", async () => {
    const received = renderDetail();
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });
    fireEvent.click(approveButton());

    fireEvent.click(
      within(confirmDialog()).getByRole("button", { name: "승인·지도 노출" }),
    );

    expect(await screen.findByText("심사 큐 화면")).toBeDefined();
    expect(decisionRequests(received)).toHaveLength(1);
    expect(new URL(decisionRequests(received)[0].request.url).pathname).toBe(
      `${DETAIL_PATH}/approve`,
    );
  });

  it("'반려'는 항목·사유 둘 다 채워질 때까지 비활성이다 (AC 9)", async () => {
    renderDetail();
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });
    expect(rejectButton().disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: "위치 영역" }));
    expect(rejectButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "   " },
    });
    expect(rejectButton().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "영역이 겹칩니다" },
    });
    expect(rejectButton().disabled).toBe(false);
  });

  it("반려를 제출하면 체크한 코드 배열과 사유로 발사되고 심사 큐로 복귀한다 (AC 9·10)", async () => {
    const received = renderDetail();
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });

    fireEvent.click(screen.getByRole("checkbox", { name: "행사 기간" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "위치 영역" }));
    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "기간이 지났고 영역이 겹칩니다" },
    });
    fireEvent.click(rejectButton());

    expect(await screen.findByText("심사 큐 화면")).toBeDefined();
    expect(decisionRequests(received)[0].body).toEqual({
      reasonCodes: ["PERIOD", "AREA"],
      reasonText: "기간이 지났고 영역이 겹칩니다",
    });
  });

  it("승인이 13450으로 실패하면 화면이 유지된 채 큐 복귀를 유도한다 (AC 11)", async () => {
    renderDetail({ decisionError: [13450, 409] });
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });
    fireEvent.click(approveButton());
    fireEvent.click(
      within(confirmDialog()).getByRole("button", { name: "승인·지도 노출" }),
    );

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("이미 처리된 신청");
    expect(
      screen.getByRole("button", { name: "심사 큐로 돌아가기" }),
    ).toBeDefined();
    // 화면 유지 — 큐로 자동 이동하지 않는다
    expect(screen.queryByText("심사 큐 화면")).toBeNull();
  });

  it("승인이 13452(격자 겹침)로 실패하면 겹침 안내와 함께 '위치 영역'이 자동 체크된다 (AC 11)", async () => {
    renderDetail({ decisionError: [13452, 409] });
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });
    fireEvent.click(approveButton());
    fireEvent.click(
      within(confirmDialog()).getByRole("button", { name: "승인·지도 노출" }),
    );

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("위치 영역");
    expect(
      screen
        .getByRole("checkbox", { name: "위치 영역" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("승인이 13451(종료일 경과)로 실패하면 승인 버튼이 잠기고 반려는 열려 있다 (AC 11, codex 2R P2)", async () => {
    renderDetail({ decisionError: [13451, 409] });
    await screen.findByRole("heading", { name: "광안리 M 드론쇼" });
    fireEvent.click(approveButton());
    fireEvent.click(
      within(confirmDialog()).getByRole("button", { name: "승인·지도 노출" }),
    );

    const alert = await screen.findByRole("alert");

    expect(alert.textContent).toContain("종료");
    // 승인은 영구 불가(nextStep "none")라 재확정 시도를 막는다 — 확실히 실패하는 요청이다
    expect(approveButton().hasAttribute("disabled")).toBe(true);
    // 반려는 여전히 유효한 조작이다
    fireEvent.click(screen.getByRole("checkbox", { name: "위치 영역" }));
    fireEvent.change(screen.getByLabelText("반려 사유"), {
      target: { value: "기간이 지난 신청입니다." },
    });
    expect(
      screen.getByRole("button", { name: "반려" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("승인됨 신청의 이력에 옛 반려 행이 있어도 반려 항목·사유를 보여주지 않는다 (AC 13, codex 2R P2)", async () => {
    // 반려 후 재신청되어 승인된 신청 — 이력에는 REJECTED 행이 남아 있다
    renderDetail({
      detail: submissionDetail({
        status: "APPROVED",
        history: [
          submissionHistory({ changedAt: "2026-09-01T01:00:00Z" }),
          submissionHistory({
            status: "REJECTED",
            reasonCodes: ["IMAGE"],
            reasonText: "옛 반려 사유 — 승인 화면에 새면 안 된다.",
            changedAt: "2026-09-02T01:00:00Z",
          }),
          submissionHistory({
            status: "APPROVED",
            changedAt: "2026-09-03T01:00:00Z",
          }),
        ],
      }),
    });

    expect(await screen.findByText("승인됨")).toBeDefined();
    expect(screen.queryByText("반려 항목")).toBeNull();
    expect(screen.queryByText("반려 사유")).toBeNull();
    expect(
      screen.queryByText("옛 반려 사유 — 승인 화면에 새면 안 된다."),
    ).toBeNull();
  });

  it("승인됨 신청으로 진입하면 확정 조작 대신 처리 결과가 보인다 (AC 13)", async () => {
    renderDetail({ detail: APPROVED });

    expect(await screen.findByText("승인됨")).toBeDefined();
    expect(screen.queryByRole("button", { name: "승인·지도 노출" })).toBeNull();
    expect(screen.queryByRole("button", { name: "반려" })).toBeNull();
    expect(screen.queryByLabelText("반려 사유")).toBeNull();
    // 지도 영역 표시는 동일하다
    expect(
      screen.getByRole("region", { name: "심사 영역 지도" }),
    ).toBeDefined();
  });

  it("반려됨 신청으로 진입하면 반려 항목 라벨과 사유가 보인다 (AC 13)", async () => {
    renderDetail({ detail: REJECTED });

    expect(await screen.findByText("반려됨")).toBeDefined();
    expect(screen.getByText("행사 기간 · 홍보 이미지")).toBeDefined();
    expect(
      screen.getByText("행사 기간이 지났고 홍보 이미지가 흐립니다."),
    ).toBeDefined();
  });

  it("비숫자 id로 진입하면 조회 없이 미발견 안내와 큐 복귀 링크가 보인다 (AC 12)", () => {
    const received = renderDetail({}, "/admin/review/abc");

    expect(screen.getByText("신청을 찾을 수 없어요")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "심사 큐로 돌아가기" }),
    ).toBeDefined();
    expect(received).toHaveLength(0);
  });

  it("상세가 404로 오면 미발견 안내로 수렴한다 (AC 12)", async () => {
    renderDetail({ detailError: [13430, 404] });

    expect(await screen.findByText("신청을 찾을 수 없어요")).toBeDefined();
  });

  it("상세 조회가 실패하면 재시도 안내가 보이고, 재시도하면 화면이 채워진다 (AC 12)", async () => {
    let broken = true;
    stubFetch((request) => {
      const { pathname } = new URL(request.url);
      if (pathname !== DETAIL_PATH)
        return errorEnvelope(9999, `unexpected: ${pathname}`, 500);
      if (broken) return errorEnvelope(13400, "조회 실패", 500);
      return envelopeResponse(IN_REVIEW);
    });
    renderWithProviders(
      <Routes>
        <Route
          path={CONSOLE_ROUTES.adminReviewDetail}
          element={<AdminReviewDetailPage />}
        />
      </Routes>,
      `/admin/review/${SUBMISSION_ID}`,
    );
    const retry = await screen.findByRole("button", { name: "다시 시도" });

    broken = false;
    fireEvent.click(retry);

    expect(
      await screen.findByRole("heading", { name: "광안리 M 드론쇼" }),
    ).toBeDefined();
  });
});
