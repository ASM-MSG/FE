import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import type { EventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import {
  submissionDetail,
  submissionHistory,
} from "@/test/org-submission-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";
import { OrgSubmissionDetailPage } from "./OrgSubmissionDetailPage";

/**
 * 심사 결과 상세 흐름 스모크 (MSG-549 AC 5~11) — 상태 3분기(심사 중·승인·반려)의 배너·
 * 결과 카드 필드와 공통 섹션(기본 정보·위치 요약·이력), CTA 라우팅·로딩/실패/비정상 접근
 * 계약을 고정한다. API에 없는 값(승인 번호·파일명)은 단정하지 않는다(추정 5·10).
 */
const SUBMITTED_AT = "2026-09-18T01:24:00";
const CHANGED_AT = "2026-09-19T05:00:00";

const IN_REVIEW_DETAIL = submissionDetail();

const APPROVED_DETAIL = submissionDetail({
  id: 13,
  status: "APPROVED",
  history: [
    submissionHistory({ changedAt: SUBMITTED_AT }),
    submissionHistory({ status: "APPROVED", changedAt: CHANGED_AT }),
  ],
});

const REJECTED_WITH_LOCATIONS = submissionDetail({
  id: 12,
  status: "REJECTED",
  startsOn: "2026-09-14",
  endsOn: "2026-09-20",
  rejection: {
    reasonCodes: ["PERIOD", "IMAGE"],
    reasonText: "행사 기간이 승인 가능한 범위를 넘습니다.",
  },
  history: [
    submissionHistory({ changedAt: SUBMITTED_AT }),
    submissionHistory({ status: "REJECTED", changedAt: CHANGED_AT }),
  ],
});

const renderDetail = (
  route = "/org/submissions/11",
  detail: () => Response | Promise<Response> = () =>
    envelopeResponse(IN_REVIEW_DETAIL),
) => {
  const received = stubFetch(detail);
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.orgSubmissionDetail}
        element={<OrgSubmissionDetailPage />}
      />
      <Route
        path={CONSOLE_ROUTES.orgSubmissions}
        element={<p>내 신청 목록 스텁</p>}
      />
      <Route
        path={CONSOLE_ROUTES.orgSubmissionEdit}
        element={<p>재신청 스텁</p>}
      />
    </Routes>,
    route,
  );
  return received;
};

const renderState = async (detail: EventSubmissionDetailResponseDto) => {
  renderDetail(`/org/submissions/${detail.id}`, () => envelopeResponse(detail));
  return screen.findByRole("region", { name: "심사 결과 상세" });
};

const infoSection = () => screen.getByRole("region", { name: "신청 정보" });

describe("심사 결과 상세 (MSG-549)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("심사 중이면 진행 배너와 신청 번호·접수일 필드가 보인다 (AC 5)", async () => {
    const card = await renderState(IN_REVIEW_DETAIL);

    expect(
      screen.getByRole("heading", { name: "심사 결과", level: 1 }),
    ).toBeDefined();
    expect(screen.getByText("서면 야간 드론쇼")).toBeDefined();
    expect(screen.getByText("심사 중")).toBeDefined();
    expect(screen.getByText("심사 진행 중")).toBeDefined();
    expect(within(card).getByText("ES-2026-0011")).toBeDefined();
    expect(within(card).getByText("2026. 9. 18. 10:24")).toBeDefined();
    expect(within(card).getByText("운영팀 검토 중")).toBeDefined();
  });

  it("심사 중 상세의 '목록으로 돌아가기'는 내 신청 목록으로 이동한다 (AC 5)", async () => {
    await renderState(IN_REVIEW_DETAIL);

    fireEvent.click(screen.getByRole("button", { name: "목록으로 돌아가기" }));

    expect(screen.getByText("내 신청 목록 스텁")).toBeDefined();
  });

  it("승인이면 노출 안내 배너와 승인일 필드가 보인다 (AC 6)", async () => {
    const card = await renderState(APPROVED_DETAIL);

    expect(
      screen.getByText(
        "행사 등록이 승인되어 일반 유저 지도와 행사방에 노출되고 있습니다.",
      ),
    ).toBeDefined();
    expect(within(card).getByText("승인일")).toBeDefined();
    expect(within(card).getByText("2026. 9. 19. 14:00")).toBeDefined();
    expect(within(card).getByText("ES-2026-0011")).toBeDefined();
  });

  it("반려면 반려 항목 라벨·검토 의견·처리일·기존 입력·위치 검토가 보인다 (AC 7)", async () => {
    const card = await renderState(REJECTED_WITH_LOCATIONS);

    expect(within(card).getByText("행사 기간 · 홍보 이미지")).toBeDefined();
    expect(
      within(card).getByText("행사 기간이 승인 가능한 범위를 넘습니다."),
    ).toBeDefined();
    expect(within(card).getByText("2026. 9. 19. 14:00")).toBeDefined();
    expect(within(card).getByText("2026-09-14 ~ 09-20")).toBeDefined();
    expect(within(card).getByText("문제 없음 · 2곳 · 총 37칸")).toBeDefined();
  });

  it("반려 상세의 '수정 후 재제출'은 재신청 화면으로 이동한다 (AC 8)", async () => {
    await renderState(REJECTED_WITH_LOCATIONS);

    fireEvent.click(screen.getByRole("button", { name: "수정 후 재제출" }));

    expect(screen.getByText("재신청 스텁")).toBeDefined();
  });

  it("기본 정보·위치 영역 요약·신청 이력이 상태와 무관하게 보인다 (AC 9)", async () => {
    await renderState(IN_REVIEW_DETAIL);
    const info = within(infoSection());

    expect(info.getByText("서면상권활성화협의회")).toBeDefined();
    expect(info.getByText("지역축제")).toBeDefined();
    expect(info.getByText("2026-09-05 ~ 09-07")).toBeDefined();
    expect(
      info.getByText("서면 일대에서 열리는 야간 드론쇼입니다."),
    ).toBeDefined();
    expect(info.getByText("드론 라이트쇼 · 거리 버스킹")).toBeDefined();
    expect(info.getByText("위치 2곳 · 총 37칸")).toBeDefined();
    expect(info.getByText("서면 상권 B-7")).toBeDefined();
    expect(info.getByText("제출")).toBeDefined();
    expect(info.getByText("2026. 9. 18. 10:24")).toBeDefined();
  });

  it("유형 전용 필드는 값이 있는 것만 보인다 (AC 9)", async () => {
    await renderState(IN_REVIEW_DETAIL);
    const info = within(infoSection());

    expect(info.getByText("주요 프로그램")).toBeDefined();
    expect(info.queryByText("운영 시간")).toBeNull();
    expect(info.queryByText("참여 방식")).toBeNull();
  });

  it("조회 중에는 로딩 안내가 보인다 (AC 10)", async () => {
    renderDetail("/org/submissions/11", () => new Promise<Response>(() => {}));

    expect(await screen.findByText("신청 상세를 불러오는 중")).toBeDefined();
  });

  it("조회가 실패하면 재시도 안내가 보이고 재시도로 상세가 복구된다 (AC 10)", async () => {
    let attempt = 0;
    renderDetail("/org/submissions/11", () => {
      attempt += 1;
      return attempt === 1
        ? errorEnvelope(14500, "server error", 500)
        : envelopeResponse(IN_REVIEW_DETAIL);
    });

    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));

    await waitFor(() =>
      expect(
        screen.getByRole("region", { name: "심사 결과 상세" }),
      ).toBeDefined(),
    );
  });

  it("경로의 신청 id가 숫자가 아니면 요청 없이 오류 안내를 보여준다 (AC 10)", async () => {
    const received = renderDetail("/org/submissions/abc");

    expect(
      await screen.findByText("잘못된 신청 번호로 들어왔어요"),
    ).toBeDefined();
    expect(received).toHaveLength(0);
    expect(screen.queryByRole("region", { name: "심사 결과 상세" })).toBeNull();
  });

  it("미지 status면 배너·결과 카드 없이 상태 칩과 공통 섹션만 렌더된다 (AC 11)", async () => {
    renderDetail("/org/submissions/11", () =>
      envelopeResponse(submissionDetail({ status: "ON_HOLD" })),
    );

    expect(
      await screen.findByRole("region", { name: "신청 정보" }),
    ).toBeDefined();
    expect(screen.getByText("ON_HOLD")).toBeDefined();
    expect(screen.queryByRole("region", { name: "심사 상태 안내" })).toBeNull();
    expect(screen.queryByRole("region", { name: "심사 결과 상세" })).toBeNull();
  });
});
