import { fireEvent, screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import {
  adminReviewFetch,
  submissionDetail,
  submissionItem,
} from "@/test/admin-review-fixture";
import { renderWithProviders } from "@/test/render-with-providers";
import { AdminReviewQueuePage } from "./AdminReviewQueuePage";

/**
 * 심사 큐 흐름 스모크 (AC 8·9·10·11) — 목록 도착 시 첫 행 자동 선택, 행 선택·탭 전환에
 * 따른 미리보기 갱신, 빈 큐·실패 상태, 상세 이동 배선만 고정한다. 표기 문자열의 세부
 * (일정 라벨·접수 시각·요약)는 순수 함수 테스트가 이미 단정하므로 여기서 중복하지 않는다.
 */
const DRONE = submissionItem({ id: 1204, title: "광안리 M 드론쇼" });
const BEACH = submissionItem({
  id: 1180,
  title: "부산바다축제 시민광장",
  organizerName: "부산축제조직위",
  type: "POPUP",
});
const APPROVED = submissionItem({
  id: 900,
  title: "수영강 야간 걷기 캠페인",
  status: "APPROVED",
});

const LISTS = { IN_REVIEW: [DRONE, BEACH], APPROVED: [APPROVED] };
const DETAILS = {
  1204: submissionDetail({ id: 1204, title: "광안리 M 드론쇼" }),
  1180: submissionDetail({
    id: 1180,
    title: "부산바다축제 시민광장",
    type: "POPUP",
  }),
  900: submissionDetail({ id: 900, title: "수영강 야간 걷기 캠페인" }),
};

/** 심사 큐를 stub 응답과 함께 띄운다 — 상세 이동 검증용 착지 라우트 동반 */
const renderQueue = (
  overrides: Partial<Parameters<typeof adminReviewFetch>[0]> = {},
) => {
  adminReviewFetch({ lists: LISTS, details: DETAILS, ...overrides });
  renderWithProviders(
    <Routes>
      <Route
        path={CONSOLE_ROUTES.adminReview}
        element={<AdminReviewQueuePage />}
      />
      <Route
        path={CONSOLE_ROUTES.adminReviewDetail}
        element={<p>심사 상세 화면</p>}
      />
    </Routes>,
    CONSOLE_ROUTES.adminReview,
  );
};

const preview = () => screen.getByRole("region", { name: "선택한 신청" });

/** 미리보기 카드에 그 행사명이 실릴 때까지 기다린다 = "그 신청이 선택됐다" */
const previewOf = (title: string) =>
  within(preview()).findByRole("heading", { name: title });

describe("관리자 심사 큐 (AC 8·9·10·11)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("목록이 도착하면 첫 행이 자동 선택돼 미리보기 카드가 채워진다 (AC 8)", async () => {
    renderQueue();

    expect(await previewOf("광안리 M 드론쇼")).toBeDefined();
  });

  it("다른 행을 클릭하면 그 신청의 상세로 미리보기가 갈아탄다 (AC 7)", async () => {
    renderQueue();
    await previewOf("광안리 M 드론쇼");

    fireEvent.click(
      screen.getByRole("button", { name: "부산바다축제 시민광장" }),
    );

    expect(await previewOf("부산바다축제 시민광장")).toBeDefined();
  });

  it("탭을 전환하면 그 상태의 목록으로 갱신되고 새 목록 첫 행이 다시 자동 선택된다 (AC 8·10)", async () => {
    renderQueue();
    await previewOf("광안리 M 드론쇼");

    fireEvent.click(screen.getByRole("button", { name: /승인됨/ }));

    expect(await previewOf("수영강 야간 걷기 캠페인")).toBeDefined();
  });

  it("미리보기의 '상세에서 영역 검토'를 누르면 선택 신청의 심사 상세로 이동한다 (AC 9)", async () => {
    renderQueue();
    await previewOf("광안리 M 드론쇼");

    fireEvent.click(screen.getByRole("button", { name: "상세에서 영역 검토" }));

    expect(screen.getByText("심사 상세 화면")).toBeDefined();
  });

  it("해당 상태의 신청이 없으면 빈 큐 안내가 보이고 미리보기는 미선택 상태다 (AC 11)", async () => {
    renderQueue({ lists: { IN_REVIEW: [] } });

    expect(
      await screen.findByText("심사 중 상태의 신청이 없어요"),
    ).toBeDefined();
    expect(
      within(preview()).getByText("신청을 선택하면 미리보기가 보여요"),
    ).toBeDefined();
  });

  it("목록 조회가 실패하면 재시도 안내가 보이고, 재시도하면 목록이 채워진다 (AC 11)", async () => {
    let broken = true;
    renderQueue({ listFails: () => broken });
    const retry = await screen.findByRole("button", { name: "다시 시도" });

    broken = false;
    fireEvent.click(retry);

    expect(await previewOf("광안리 M 드론쇼")).toBeDefined();
  });
});
