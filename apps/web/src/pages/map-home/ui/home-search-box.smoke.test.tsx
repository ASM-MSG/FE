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
 * MSG-412: 격자 검색 섹션(장소 결과 위·매치 없으면 미노출·선택 콜백) 계약 추가 —
 * 기존 계약 불변, props만 확장(onGridSelect·onZoneSelect).
 */
const renderBox = (
  over: Partial<Parameters<typeof HomeSearchBox>[0]> = {},
) =>
  renderWithProviders(
    <HomeSearchBox
      onPlaceSelect={() => {}}
      onGridSelect={() => {}}
      onZoneSelect={() => {}}
      {...over}
    />,
  );

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

// 서면(부산 부산진구) 구역 사각형 픽스처 — 세로 4칸(A~D행)·가로 6칸(1~6열)
const ZONE = {
  zoneKey: "seomyeon",
  name: "서면",
  regionCode: null,
  minGridY: 16850,
  maxGridY: 16853,
  minGridX: 11419,
  maxGridX: 11424,
  priority: 1,
};

/** 스텁이 경로 계약을 강제한다 — zones·trending·places 외 요청은 실패 응답 */
const stubSearchApis = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/zones") return envelopeResponse([ZONE]);
      if (pathname === "/api/search/trending") return envelopeResponse([]);
      if (pathname === "/api/search/places") return envelopeResponse([]);
      return new Response(null, { status: 500 });
    }),
  );

describe("격자 검색 섹션 (MSG-412 AC 8)", () => {
  const signIn = () =>
    useAuthStore.setState({ accessToken: "t", isAuthenticated: true });

  it('로그인 상태에서 "서면 A-1"을 입력하면 격자 섹션이 장소 결과와 구분되어 표시된다 (AC 8)', async () => {
    stubSearchApis();
    signIn();
    renderBox();

    act(() => searchInput().focus());
    fireEvent.change(searchInput(), { target: { value: "서면 A-1" } });

    expect(await screen.findByRole("button", { name: "서면 A-1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "격자" })).toBeTruthy();
  });

  it("격자 결과 클릭 시 onGridSelect(gridId)가 호출되고 드롭다운이 닫힌다 (AC 9 배선)", async () => {
    stubSearchApis();
    signIn();
    const onGridSelect = vi.fn();
    renderBox({ onGridSelect });
    act(() => searchInput().focus());
    fireEvent.change(searchInput(), { target: { value: "서면 A-1" } });
    const row = await screen.findByRole("button", { name: "서면 A-1" });

    fireEvent.click(row);

    // 행 A = 북단(maxGridY), 열 1 = 서단(minGridX) — 서버 명명 역대응 (AC 2)
    expect(onGridSelect).toHaveBeenCalledWith(
      `${ZONE.maxGridY}_${ZONE.minGridX}`,
    );
    expect(screen.queryByRole("heading", { name: "격자" })).toBeNull();
  });

  it("구역명만 매치되면 구역 결과가 나오고 선택 시 onZoneSelect(bounds)가 호출된다 (AC 7)", async () => {
    stubSearchApis();
    signIn();
    const onZoneSelect = vi.fn();
    renderBox({ onZoneSelect });
    act(() => searchInput().focus());
    fireEvent.change(searchInput(), { target: { value: "서면" } });
    const row = await screen.findByRole("button", { name: "서면" });

    fireEvent.click(row);

    expect(onZoneSelect).toHaveBeenCalledTimes(1);
    const bounds = onZoneSelect.mock.calls[0][0];
    expect(bounds.sw.lat).toBeLessThan(bounds.ne.lat);
    expect(bounds.sw.lng).toBeLessThan(bounds.ne.lng);
    expect(screen.queryByRole("heading", { name: "격자" })).toBeNull();
  });

  it("매치가 없으면 격자 섹션 자체가 없다 (AC 8)", async () => {
    stubSearchApis();
    signIn();
    renderBox();

    act(() => searchInput().focus());
    fireEvent.change(searchInput(), { target: { value: "해운대 A-1" } });

    // 장소 검색(디바운스)까지 끝난 시점에도 격자 섹션은 없다
    expect(await screen.findByText("검색 결과가 없어요.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "격자" })).toBeNull();
  });
});
