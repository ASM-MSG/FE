import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { envelopeResponse } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { HomeSearchBox } from "./HomeSearchBox";

/**
 * 홈 검색 박스 비로그인 진입 차단 스모크 (MSG-328 사용자 피드백) — 고정하는 계약:
 * 비로그인 시 검색창은 입력 진입(포커스) 자체가 막히고, 클릭·키보드 접근 즉시
 * 도감과 동일하게 로그인 모달이 열리며, 검색 계열 쿼리는 발사되지 않는다.
 * 로그인 상태의 포커스 → 인기 검색어 드롭다운은 회귀 가드로 함께 고정한다.
 */
const renderBox = () =>
  renderWithProviders(<HomeSearchBox onPlaceSelect={() => {}} />);

const searchInput = () => screen.getByPlaceholderText("장소, 격자 검색");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  useLoginModalStore.setState({ open: false });
});

describe("비로그인 검색창 = 로그인 모달 (포커스 차단)", () => {
  it("비로그인 상태에서 검색창을 누르면 포커스 대신 로그인 모달이 열리고 쿼리는 발사되지 않는다", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    renderBox();

    fireEvent.mouseDown(searchInput());

    expect(useLoginModalStore.getState().open).toBe(true);
    expect(document.activeElement).not.toBe(searchInput());
    // 드롭다운(로그인 유도 포함 어떤 내용이든)이 열리지 않는다 — 모달로 대체된 흐름
    expect(screen.queryByText(/인기 검색어/)).toBeNull();
    expect(screen.queryByRole("button", { name: "로그인" })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("비로그인 키보드(Tab) 포커스도 동일하게 로그인 모달이 뜨고 입력에 머물지 않는다 (a11y — 무반응 금지)", () => {
    renderBox();

    act(() => searchInput().focus());

    expect(useLoginModalStore.getState().open).toBe(true);
    expect(document.activeElement).not.toBe(searchInput());
  });

  it("로그인 상태 포커스는 기존대로 인기 검색어 드롭다운을 연다 (회귀 없음)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelopeResponse([{ rank: 1, keyword: "서면" }])),
    );
    useAuthStore.setState({ accessToken: "t", isAuthenticated: true });
    renderBox();

    act(() => searchInput().focus());

    expect(await screen.findByText("인기 검색어")).toBeTruthy();
    expect(await screen.findByText("서면")).toBeTruthy();
    expect(useLoginModalStore.getState().open).toBe(false);
  });

  it("드롭다운이 열린 채 인증이 풀리면(세션 만료) 드롭다운을 닫고 포커스를 해제한다 (리뷰 P2)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => envelopeResponse([{ rank: 1, keyword: "서면" }])),
    );
    useAuthStore.setState({ accessToken: "t", isAuthenticated: true });
    renderBox();
    act(() => searchInput().focus());
    expect(await screen.findByText("인기 검색어")).toBeTruthy();

    act(() => useAuthStore.getState().logout());

    // 다음 클릭·포커스 이벤트를 기다리지 않고 즉시 게이트와 일치해야 한다 —
    // 캐시된 인기 검색어/검색 결과가 비로그인에게 계속 보이면 게이트 모순
    expect(screen.queryByText("인기 검색어")).toBeNull();
    expect(document.activeElement).not.toBe(searchInput());
  });
});
