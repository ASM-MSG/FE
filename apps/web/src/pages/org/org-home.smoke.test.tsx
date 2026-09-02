import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import type { EventSubmissionMyListResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import {
  MY_LIST,
  MY_SUBMISSIONS,
  REJECTED_DETAIL,
  submissionSummary,
} from "@/test/org-submission-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";
import { OrgHomePage } from "./OrgHomePage";

/**
 * 운영자 홈 대시보드 흐름 스모크 (MSG-545 AC 1~9) — 목록 1회 조회에서 파생되는
 * 카운트·목록·필터·대표 요약과 라우팅·빈 상태·실패 재시도 계약을 고정한다.
 * 스타일·문구 세부는 단정하지 않는다(칩 라벨·CTA 라벨처럼 기획이 못 박은 것만).
 */
const EMPTY_LIST: EventSubmissionMyListResponseDto = {
  counts: { inReview: 0, approved: 0, rejected: 0 },
  submissions: [],
};

/** counts를 목록 건수(3)와 다르게 둔다 — 전체 신청이 submissions.length가 아님을 드러낸다 */
const DISTINCT_COUNTS: EventSubmissionMyListResponseDto = {
  ...MY_LIST,
  counts: { inReview: 2, approved: 4, rejected: 1 },
};

const stubHome = (
  list: EventSubmissionMyListResponseDto,
  detail: () => Response = () => envelopeResponse(REJECTED_DETAIL),
) =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname.endsWith("/event-submissions/my")) {
      return envelopeResponse(list);
    }
    return detail();
  });

const renderHome = () =>
  renderWithProviders(
    <Routes>
      <Route path={CONSOLE_ROUTES.orgHome} element={<OrgHomePage />} />
      <Route
        path={CONSOLE_ROUTES.orgSubmissionNew}
        element={<p>새 행사 등록 스텁</p>}
      />
      <Route
        path={CONSOLE_ROUTES.orgSubmissionDetail}
        element={<p>신청 상세 스텁</p>}
      />
      <Route path={CONSOLE_ROUTES.orgGuide} element={<p>등록 가이드 스텁</p>} />
    </Routes>,
    CONSOLE_ROUTES.orgHome,
  );

const submissionRows = () =>
  within(screen.getByRole("list", { name: "최근 신청 목록" })).getAllByRole(
    "button",
  );

/** 요약 카드까지 그려진 대시보드 — AC 4·5 케이스가 같은 준비를 공유한다 */
const renderSummaryCard = (
  list: EventSubmissionMyListResponseDto = MY_LIST,
  detail?: () => Response,
) => {
  stubHome(list, detail);
  renderHome();
  return screen.findByRole("region", { name: "심사 결과 요약" });
};

describe("운영자 홈 대시보드 (MSG-545)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("카운트 카드 4종이 렌더되고 전체 신청은 counts 3필드 합산이다 (AC 1, 추정 2)", async () => {
    stubHome(DISTINCT_COUNTS);
    renderHome();

    expect(await screen.findByText("전체 신청")).toBeDefined();
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });

  it("최근 신청 목록이 서버 순서 그대로 렌더되고 행마다 기간·상태 라벨이 보인다 (AC 2)", async () => {
    stubHome(MY_LIST);
    renderHome();

    await screen.findByRole("list", { name: "최근 신청 목록" });

    const rows = submissionRows();
    expect(rows.map((row) => row.textContent)).toEqual([
      "서면 야간 드론쇼9.5–9.7심사 중",
      "서면 여름 팝업 마켓9.14–9.20반려됨",
      "서면 빛 축제10.2–10.6승인됨",
    ]);
  });

  it("미지 status 행도 목록에 남고 라벨을 원문으로 표시한다 (AC 2, 추정 6)", async () => {
    stubHome({
      ...MY_LIST,
      submissions: [
        ...MY_SUBMISSIONS,
        submissionSummary({ id: 14, status: "ON_HOLD" }),
      ],
    });
    renderHome();

    await screen.findByRole("list", { name: "최근 신청 목록" });

    expect(submissionRows()).toHaveLength(4);
    expect(screen.getByText("ON_HOLD")).toBeDefined();
  });

  it("상태 필터 칩을 누르면 그 상태의 행만 남고 칩이 활성 강조된다 (AC 3)", async () => {
    stubHome(MY_LIST);
    renderHome();
    await screen.findByRole("list", { name: "최근 신청 목록" });

    fireEvent.click(screen.getByRole("button", { name: "승인됨" }));

    const rows = submissionRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("서면 빛 축제");
    expect(
      screen
        .getByRole("button", { name: "승인됨" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("필터 결과가 0건이면 빈 문구가 보인다 (AC 3, 추정 7)", async () => {
    stubHome({ ...MY_LIST, submissions: [submissionSummary()] });
    renderHome();
    await screen.findByRole("list", { name: "최근 신청 목록" });

    fireEvent.click(screen.getByRole("button", { name: "반려됨" }));

    expect(screen.getByText("해당 상태의 신청이 없어요")).toBeDefined();
  });

  it("요약 카드에 첫 반려 신청이 대표로 오고 상태·행사명·신청/처리 일자가 보인다 (AC 4)", async () => {
    const summary = await renderSummaryCard();

    expect(within(summary).getByText("서면 여름 팝업 마켓")).toBeDefined();
    expect(within(summary).getByText("반려됨")).toBeDefined();
    expect(
      await within(summary).findByText("신청 2026. 8. 18. · 처리 8. 19."),
    ).toBeDefined();
  });

  it("대표가 반려면 상세 조회로 반려 사유 본문이 사유 박스에 보인다 (AC 5, 추정 4)", async () => {
    const summary = await renderSummaryCard();

    expect(
      await within(summary).findByText(
        "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
      ),
    ).toBeDefined();
  });

  it("대표가 비반려면 사유 박스 없이 최종 수정 일자만 보인다 (AC 5, 추정 5)", async () => {
    const summary = await renderSummaryCard({
      ...MY_LIST,
      submissions: [submissionSummary({ updatedAt: "2026-08-25T03:00:00" })],
    });

    expect(within(summary).getByText("최종 수정 2026. 8. 25.")).toBeDefined();
    expect(within(summary).queryByText("반려 사유")).toBeNull();
  });

  it("상세 조회가 실패하면 사유 영역에 재시도가 보이고 재시도로 사유가 복구된다 (AC 5)", async () => {
    let attempt = 0;
    await renderSummaryCard(MY_LIST, () => {
      attempt += 1;
      return attempt === 1
        ? errorEnvelope(14500, "server error", 500)
        : envelopeResponse(REJECTED_DETAIL);
    });

    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByText(
        "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
      ),
    ).toBeDefined();
  });

  it("요약 카드 '심사 결과 상세 보기'는 신청 상세로 이동한다 (AC 6)", async () => {
    stubHome(MY_LIST);
    renderHome();

    fireEvent.click(
      await screen.findByRole("button", { name: "심사 결과 상세 보기" }),
    );

    expect(screen.getByText("신청 상세 스텁")).toBeDefined();
  });

  it("목록 행을 클릭하면 그 신청의 상세로 이동한다 (AC 6)", async () => {
    stubHome(MY_LIST);
    renderHome();
    await screen.findByRole("list", { name: "최근 신청 목록" });

    fireEvent.click(submissionRows()[0]);

    expect(screen.getByText("신청 상세 스텁")).toBeDefined();
  });

  it("우상단 '+ 새 행사 등록'은 등록 위저드로 이동한다 (AC 7)", async () => {
    stubHome(MY_LIST);
    renderHome();

    fireEvent.click(
      await screen.findByRole("button", { name: "+ 새 행사 등록" }),
    );

    expect(screen.getByText("새 행사 등록 스텁")).toBeDefined();
  });

  it("신청이 0건이면 빈 상태 안내와 요약 카드 빈 변형이 보인다 (AC 8)", async () => {
    stubHome(EMPTY_LIST);
    renderHome();

    expect(await screen.findByText("아직 등록한 행사가 없어요")).toBeDefined();
    expect(screen.getByText("신청을 선택하면")).toBeDefined();
    expect(screen.queryByRole("list", { name: "최근 신청 목록" })).toBeNull();
  });

  it("빈 상태 '첫 행사 등록하기'는 등록 위저드로 이동한다 (AC 7·8)", async () => {
    stubHome(EMPTY_LIST);
    renderHome();

    fireEvent.click(
      await screen.findByRole("button", { name: "첫 행사 등록하기" }),
    );

    expect(screen.getByText("새 행사 등록 스텁")).toBeDefined();
  });

  it("빈 상태 '등록 가이드 보기'는 등록 가이드로 이동한다 (AC 7·8)", async () => {
    stubHome(EMPTY_LIST);
    renderHome();

    fireEvent.click(
      await screen.findByRole("button", { name: "등록 가이드 보기" }),
    );

    expect(screen.getByText("등록 가이드 스텁")).toBeDefined();
  });

  it("목록 조회가 실패하면 재시도 안내가 보이고 재시도로 대시보드가 복구된다 (AC 9)", async () => {
    let attempt = 0;
    stubFetch(() => {
      attempt += 1;
      return attempt === 1
        ? errorEnvelope(14500, "server error", 500)
        : envelopeResponse(MY_LIST);
    });
    renderHome();

    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));

    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "최근 신청 목록" }),
      ).toBeDefined(),
    );
  });
});
