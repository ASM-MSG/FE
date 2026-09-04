import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import type { EventSubmissionMyListResponseDto } from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import {
  MY_LIST,
  MY_SUBMISSIONS,
  submissionSummary,
} from "@/test/org-submission-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";
import { OrgSubmissionsPage } from "./OrgSubmissionsPage";

/**
 * 내 신청 목록 흐름 스모크 (MSG-549 AC 1~4·11) — 목록 1회 조회에서 파생되는 부제 요약·행
 * 표기·상태 필터와 라우팅 3종·빈/로딩/실패 계약을 고정한다. 스타일 세부는 단정하지 않고
 * 기획이 못 박은 문구(칩 라벨·CTA 라벨·빈 문구)만 본다.
 */
const EMPTY_LIST: EventSubmissionMyListResponseDto = {
  counts: { inReview: 0, approved: 0, rejected: 0 },
  submissions: [],
};

const renderList = (
  route:
    | string
    | { pathname: string; state: unknown } = CONSOLE_ROUTES.orgSubmissions,
) =>
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.orgSubmissions}
        element={<OrgSubmissionsPage />}
      />
      <Route
        path={CONSOLE_ROUTES.orgSubmissionNew}
        element={<p>새 행사 등록 스텁</p>}
      />
      <Route
        path={CONSOLE_ROUTES.orgSubmissionDetail}
        element={<p>신청 상세 스텁</p>}
      />
      <Route
        path={CONSOLE_ROUTES.orgSubmissionEdit}
        element={<p>재신청 스텁</p>}
      />
    </Routes>,
    route,
  );

const stubList = (list: EventSubmissionMyListResponseDto) =>
  stubFetch(() => envelopeResponse(list));

const rows = async () =>
  within(
    await screen.findByRole("list", { name: "내 신청 목록" }),
  ).getAllByRole("listitem");

describe("내 신청 목록 (MSG-549)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("목록이 서버 순서로 렌더되고 행마다 순번·행사명·상태·기간·유형이 보인다 (AC 1)", async () => {
    stubList(MY_LIST);
    renderList();

    const list = await rows();

    expect(list).toHaveLength(3);
    expect(list[0].textContent).toContain("01");
    expect(list[0].textContent).toContain("서면 야간 드론쇼");
    expect(list[0].textContent).toContain("심사 중");
    expect(list[0].textContent).toContain("행사 2026-09-05 ~ 09-07");
    expect(list[0].textContent).toContain("지역축제");
    expect(list[2].textContent).toContain("서면 빛 축제");
  });

  it("부제에 counts 파생 요약이 보인다 (AC 1)", async () => {
    stubList(MY_LIST);
    renderList();

    expect(
      await screen.findByText("신청 3건 (심사 중 1 · 승인 1 · 반려 1)"),
    ).toBeDefined();
  });

  it("상태 필터 칩을 누르면 그 상태의 행만 남고 칩이 활성 강조된다 (AC 2)", async () => {
    stubList(MY_LIST);
    renderList();
    await rows();

    fireEvent.click(screen.getByRole("button", { name: "승인됨" }));

    const filtered = await rows();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].textContent).toContain("서면 빛 축제");
    expect(
      screen
        .getByRole("button", { name: "승인됨" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("필터 결과가 0건이면 한 줄 빈 문구가 보인다 (AC 2)", async () => {
    stubList({ ...MY_LIST, submissions: [submissionSummary()] });
    renderList();
    await rows();

    fireEvent.click(screen.getByRole("button", { name: "반려됨" }));

    expect(screen.getByText("해당 상태의 신청이 없어요")).toBeDefined();
  });

  it("행사명을 누르면 그 신청의 상세로 이동한다 (AC 3)", async () => {
    stubList(MY_LIST);
    renderList();

    fireEvent.click(
      await screen.findByRole("button", { name: "서면 야간 드론쇼" }),
    );

    expect(screen.getByText("신청 상세 스텁")).toBeDefined();
  });

  it("반려 행의 '수정 후 재신청'은 재신청 화면으로 이동한다 (AC 3)", async () => {
    stubList(MY_LIST);
    renderList();

    fireEvent.click(
      await screen.findByRole("button", { name: "수정 후 재신청" }),
    );

    expect(screen.getByText("재신청 스텁")).toBeDefined();
  });

  it("행의 '상세 보기'도 상세로 이동한다 (AC 3)", async () => {
    stubList(MY_LIST);
    renderList();
    const list = await rows();

    fireEvent.click(within(list[1]).getByRole("button", { name: "상세 보기" }));

    expect(screen.getByText("신청 상세 스텁")).toBeDefined();
  });

  it("미지 status 행도 목록에 남고 라벨을 원문으로 표시한다 (AC 11)", async () => {
    stubList({
      ...MY_LIST,
      submissions: [
        ...MY_SUBMISSIONS,
        submissionSummary({ id: 14, status: "ON_HOLD" }),
      ],
    });
    renderList();

    expect(await rows()).toHaveLength(4);
    expect(screen.getByText("ON_HOLD")).toBeDefined();
  });

  it("신청이 0건이면 빈 문구와 새 행사 등록 유도가 보인다 (AC 4)", async () => {
    stubList(EMPTY_LIST);
    renderList();

    expect(await screen.findByText("아직 등록한 행사가 없어요")).toBeDefined();
    expect(screen.queryByRole("list", { name: "내 신청 목록" })).toBeNull();
  });

  it("우상단 '+ 새 행사 등록'은 등록 위저드로 이동한다 (AC 4)", async () => {
    stubList(MY_LIST);
    renderList();

    fireEvent.click(
      await screen.findByRole("button", { name: "+ 새 행사 등록" }),
    );

    expect(screen.getByText("새 행사 등록 스텁")).toBeDefined();
  });

  it("조회 중에는 로딩 안내가 보인다 (AC 4)", async () => {
    stubFetch(() => new Promise<Response>(() => {}));
    renderList();

    expect(await screen.findByText("신청 목록을 불러오는 중")).toBeDefined();
  });

  it("제출 직후 진입하면 신청 번호가 담긴 접수 안내가 보인다 (MSG-548 AC 10)", async () => {
    stubList(MY_LIST);
    renderList({
      pathname: CONSOLE_ROUTES.orgSubmissions,
      state: { submittedNo: "FM-2026-0007" },
    });

    expect(
      await screen.findByText("신청 접수 완료 · FM-2026-0007"),
    ).toBeDefined();
    expect(screen.getByText(/1~2영업일/)).toBeDefined();
  });

  it("접수 안내 state 없이 들어오면 안내가 없다 (MSG-548 AC 10 — 직접 방문·재방문)", async () => {
    stubList(MY_LIST);
    renderList();
    await rows();

    expect(screen.queryByText(/신청 접수 완료/)).toBeNull();
  });

  it("조회가 실패하면 재시도 안내가 보이고 재시도로 목록이 복구된다 (AC 4)", async () => {
    let attempt = 0;
    stubFetch(() => {
      attempt += 1;
      return attempt === 1
        ? errorEnvelope(14500, "server error", 500)
        : envelopeResponse(MY_LIST);
    });
    renderList();

    fireEvent.click(await screen.findByRole("button", { name: "다시 시도" }));

    await waitFor(() =>
      expect(screen.getByRole("list", { name: "내 신청 목록" })).toBeDefined(),
    );
  });
});
