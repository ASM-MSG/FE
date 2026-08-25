import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { envelopeResponse } from "@/test/envelope-response";
import { stubInstantLoadImage } from "@/test/instant-load-image";
import { ProfilePanel } from "./ProfilePanel";

/**
 * 프로필 패널 스모크 (MSG-124 승격 → MSG-329 실 API 재설계 + MSG-378 병합).
 * mock(MOCK_PROFILE) 소스가 폐기되고 GET /api/users/me 실 연동으로 바뀌어 fetch 스텁
 * 기반으로 재설계했다. 고정 범위: 실 응답 렌더(A1)·가입일 KST 표기·기본 아바타(MSG-378)·
 * 앱 버전 빌드 주입(A5)·오류/재시도(A3)·[계정 삭제] 행 신설(A10)·로그아웃 회귀(A12)·편집 모달.
 * 스타일·간격 단정은 넣지 않는다 — 픽셀 판정은 브라우저 검증의 몫.
 */

const PROFILE = {
  email: "fillmapper@fillmap.app",
  nickname: "필맵퍼",
  profileImageUrl: null,
  createdAt: "2026-05-02T09:00:00",
  // 로그인 시딩 기본값 — false면 온보딩 동의 게이트 대상 (MSG-407 픽스처 보수)
  locationConsent: true,
};

/** 대표 뱃지 2개 픽스처 — rank 역순 배열로 줘서 rank 정렬이 실제로 일어남을 관찰한다 (ADHOC AC 2) */
const FEATURED_BADGES = [
  {
    badgeId: 5,
    code: "RECORDER_3",
    name: "기록러 Ⅲ",
    earned: true,
    iconUrl: null,
    earnedAt: "2026-08-01T00:00:00Z",
    featuredRank: 2,
  },
  {
    badgeId: 4,
    code: "RECORDER_1",
    name: "기록러 Ⅰ",
    earned: true,
    iconUrl: null,
    earnedAt: "2026-07-01T00:00:00Z",
    featuredRank: 1,
  },
  {
    badgeId: 1,
    code: "EXPLORER_1",
    name: "첫 발자국",
    earned: true,
    iconUrl: null,
    earnedAt: "2026-06-01T00:00:00Z",
    featuredRank: null,
  },
];

/** 현재 경로 노출 대역 — 클릭이 라우팅을 일으키지 않음을 단정하기 위한 관찰 지점 */
const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderPanel = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={["/profile"]}>
        <Routes>
          <Route path="/profile" element={<ProfilePanel />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** fetch 목 — pathname 라우팅. 기본은 getMe 성공 응답 */
const stubApi = (route?: (request: Request) => Response | null) => {
  const fetchMock = vi.fn(async (input: Request) => {
    const custom = route?.(input);
    if (custom) return custom;
    const { pathname } = new URL(input.url);
    if (pathname === "/api/users/me") {
      return envelopeResponse(PROFILE);
    }
    // 헤더 pill 파생 원천 (ADHOC) — 기본은 대표 미설정: 메타 줄 폴백 경로가 기본이다
    if (pathname === "/api/badges") {
      return envelopeResponse([]);
    }
    return new Response(null, { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => {
  useAuthStore.setState({ isAuthenticated: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("프로필 패널 스모크 (MSG-329·MSG-378)", () => {
  it("실 API 응답의 닉네임·가입일(KST)·이메일이 표시되고, mock 활동 수치는 없다 (A1·A4·MSG-378)", async () => {
    stubApi();
    renderPanel();

    expect(await screen.findByText(PROFILE.nickname)).toBeTruthy();
    // 가입일은 서버 createdAt(UTC)의 KST 표기 — 이메일과 한 메타 라벨 (MSG-378·MSG-322)
    expect(
      screen.getByText(`가입일 2026.05.02 · ${PROFILE.email}`),
    ).toBeTruthy();
    // "내 활동" 카드는 "—" (A4 — mock 값 잔존 금지)
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText(/일 연속/)).toBeNull();
  });

  it("대표 뱃지가 있으면 헤더 메타 줄 자리에 pill이 rank 순으로 표시된다 (ADHOC AC 2 — 승인 A1: 메타 줄 대체)", async () => {
    stubApi((request) => {
      if (new URL(request.url).pathname !== "/api/badges") return null;
      return envelopeResponse(FEATURED_BADGES);
    });
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    const pills = await screen.findByRole("list", { name: "대표 뱃지" });

    // rank 역순 응답이 rank 오름차순 pill로 — 비대표(첫 발자국)는 제외 (AC 1 배선)
    expect(
      within(pills)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["기록러 Ⅰ", "기록러 Ⅲ"]);
    // 메타 줄은 pill로 대체된다 — 헤더는 항상 2줄 (승인 A1)
    expect(screen.queryByText(/가입일/)).toBeNull();
  });

  it("대표 뱃지 0개면 pill 없이 기존 메타 줄이 그대로고, 조회(GET /api/badges)는 발사된다 (ADHOC AC 4·5)", async () => {
    const fetchMock = stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    expect(screen.queryByRole("list", { name: "대표 뱃지" })).toBeNull();
    expect(
      screen.getByText(`가입일 2026.05.02 · ${PROFILE.email}`),
    ).toBeTruthy();
    // 프로필 페이지도 badges를 조회한다 — useBadgesQuery 재사용 배선 (AC 5)
    const paths = fetchMock.mock.calls.map(
      ([request]) => new URL(request.url).pathname,
    );
    expect(paths).toContain("/api/badges");
  });

  it("profileImageUrl null이면 헤더 아바타가 기본 이미지고 닉네임 첫 글자 fallback이 없다 (MSG-378 기준 16)", async () => {
    stubApi();
    stubInstantLoadImage();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    const avatar = (await screen.findByAltText(
      PROFILE.nickname,
    )) as HTMLImageElement;
    expect(avatar.src).toContain("default-profile-image");
    // 구 avatarFallback(닉네임 첫 글자) 대체 확인 — MSG-378에서 기본 이미지 에셋으로 전환
    expect(screen.queryByText(PROFILE.nickname.slice(0, 1))).toBeNull();
  });

  it("앱 버전 행은 빌드 주입 값(vitest 센티널)을 표시하는 정보 행이다 (A5)", async () => {
    stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    // vite.config define — vitest(mode=test)는 "0.0.0-test" 센티널 (MOCK "1.0.0" 소스 제거)
    expect(screen.getByText("0.0.0-test")).toBeTruthy();
    expect(screen.queryByText("1.0.0")).toBeNull();
    expect(screen.queryByRole("button", { name: /앱 버전/ })).toBeNull();
  });

  it("조회 실패 시 오류 상태(제목+안내+[다시 시도])가 뜨고 [다시 시도]로 재조회된다 (A3)", async () => {
    let failNext = true;
    stubApi((request) => {
      if (new URL(request.url).pathname !== "/api/users/me") return null;
      if (failNext) {
        failNext = false;
        return new Response(null, { status: 500 });
      }
      return null; // 기본 성공 응답
    });
    renderPanel();

    expect(await screen.findByText("프로필을 불러오지 못했어요")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText(PROFILE.nickname)).toBeTruthy();
  });

  it("비활성 › 행은 4개(준비 중)이고, [계정 삭제]는 활성 행이다 (A10 — MSG-408에서 '알림 설정' 준비 중 행이 토글 행으로 대체돼 5→4)", async () => {
    stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    const disabledRows = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-disabled") === "true");
    expect(disabledRows.map((b) => b.textContent)).toEqual([
      "위치정보 동의 관리준비 중",
      "신고 관리준비 중",
      "서비스 이용약관준비 중",
      "개인정보 처리방침준비 중",
    ]);

    const deleteRow = screen.getByRole("button", { name: "계정 삭제" });
    expect(deleteRow.getAttribute("aria-disabled")).toBeNull();
    expect(deleteRow.textContent).not.toContain("준비 중");
  });

  // MSG-477 ①: "알림 받기" 토글(MSG-408)·"알림 설정" 행(MSG-409)을 삭제했다 —
  // 웹 설정 UI의 알림 진입점 제거(푸시 수신 표시·모바일 토글은 유지). 부재 단정으로 교체.
  it("'알림 받기' 토글과 '알림 설정' 행이 렌더되지 않는다 (MSG-477 A1)", async () => {
    stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    expect(screen.queryByRole("switch", { name: "알림 받기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "알림 설정" })).toBeNull();
    expect(screen.queryByText("미지원 브라우저")).toBeNull();
  });

  it("[계정 삭제] 클릭 시 비가역 삭제 확인 모달(danger)이 뜬다 — URL 불변 (A10)", async () => {
    stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    fireEvent.click(screen.getByRole("button", { name: "계정 삭제" }));

    expect(
      screen.getAllByRole("dialog", { name: "계정 삭제" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/되돌릴 수 없어요/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "삭제" })).toBeTruthy();
    expect(screen.getByTestId("location").textContent).toBe("/profile");
  });

  it("[로그아웃] 클릭 시 /api/auth/logout 호출 후 비로그인 상태가 되고, 즉시 홈으로 이동한다 (A12 — 기존 배선 회귀 확인)", async () => {
    const fetchMock = stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() =>
      expect(useAuthStore.getState().isAuthenticated).toBe(false),
    );
    const paths = fetchMock.mock.calls.map(
      ([request]) => new URL(request.url).pathname,
    );
    expect(paths).toContain("/api/auth/logout");
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toBe("/"),
    );
    expect(screen.queryByText(PROFILE.nickname)).toBeNull();
  });

  it("[편집] 클릭 시 '프로필 편집' 모달이 열리고 닉네임이 실 응답 값으로 채워져 있다", async () => {
    stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);

    fireEvent.click(screen.getByRole("button", { name: "편집" }));

    expect(
      screen.getAllByRole("dialog", { name: "프로필 편집" }).length,
    ).toBeGreaterThan(0);
    const nicknameInput = screen.getByLabelText("닉네임") as HTMLInputElement;
    expect(nicknameInput.value).toBe(PROFILE.nickname);

    // [변경]은 순수 프레젠테이셔널 트리거 — 토글 시맨틱(aria-pressed) 미노출 고정 (PR #22)
    expect(
      screen.getByRole("button", { name: "변경" }).hasAttribute("aria-pressed"),
    ).toBe(false);
  });

  it("닉네임을 1자로 바꾸면 [저장]이 비활성되고 사유가 표시된다 (A7 화면 배선)", async () => {
    stubApi();
    renderPanel();
    await screen.findByText(PROFILE.nickname);
    fireEvent.click(screen.getByRole("button", { name: "편집" }));

    fireEvent.change(screen.getByLabelText("닉네임"), {
      target: { value: "한" },
    });

    expect(
      (screen.getByRole("button", { name: "저장" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("닉네임은 2~20자로 입력해주세요")).toBeTruthy();
  });
});
