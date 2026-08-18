import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPermission,
  readPushCapabilities,
  requestPermission,
} from "@/features/notifications/api/messaging";
import { usePushTokenStore } from "@/features/notifications/model/push-token-store";
import { fcmTokenStorage } from "@/shared/storage";
import { envelopeResponse } from "@/test/envelope-response";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";

/**
 * 알림 설정 패널 흐름 스모크 (MSG-409 AC 2·4·5·6·9·10·11·12) — 로딩 게이트,
 * 매핑 표 라벨·서버 값 반영, 토글 즉시 전환+PATCH 발사, 배너 3분기(미지원/CTA/미렌더),
 * 오류 게이트 재시도, 뒤로가기 복귀를 고정한다. 스타일·간격 단정 없음 — 픽셀은
 * 브라우저 검증 몫. firebase는 격리 경계(api/messaging) 모킹 — 기본값은 jsdom 실상과
 * 같은 미지원, 지원 시나리오는 케이스에서 오버라이드 (use-push-toggle.test 관례).
 */
vi.mock("@/features/notifications/api/messaging", () => ({
  readPushCapabilities: vi.fn(() => ({
    hasNotification: false,
    hasServiceWorker: false,
    hasPushManager: false,
  })),
  getPermission: vi.fn<() => NotificationPermission | null>(() => null),
  requestPermission: vi.fn(async () => "granted" as NotificationPermission),
  fetchFcmToken: vi.fn(async () => "tok-1"),
}));

/** 현재 경로 노출 대역 — 뒤로가기·행 클릭의 라우팅 단정용 (profile-panel 스모크 관례) */
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
      <MemoryRouter initialEntries={["/profile/notifications"]}>
        <Routes>
          <Route
            path="/profile/notifications"
            element={<NotificationSettingsPanel />}
          />
          <Route path="/profile" element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

/** fetch 목 — 기본: GET은 서버 상태(소식 2종 off), PATCH는 멱등 전체 상태 응답 */
const SERVER_PREFERENCES = [
  { category: "HOTZONE", enabled: false },
  { category: "WEEKLY", enabled: false },
];

const stubApi = (
  route?: (request: Request) => Response | Promise<Response> | null,
) => {
  const fetchMock = vi.fn(async (input: Request) => {
    const custom = route?.(input);
    if (custom) return custom;
    // GET·PATCH 공통 — PATCH 응답도 "변경 후 전체 상태" 봉투다 (멱등 계약)
    return envelopeResponse({ preferences: SERVER_PREFERENCES });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const switchOf = (name: string | RegExp) =>
  screen.getByRole("switch", { name }) as HTMLButtonElement;

beforeEach(() => {
  fcmTokenStorage.clear();
  usePushTokenStore.setState({ token: null });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("알림 설정 패널 스모크 (MSG-409)", () => {
  it("로딩 완료 전에는 DotsLoader만 보이고, 완료되면 토글이 한번에 표시된다 (AC 4 로딩 게이트)", async () => {
    let resolveGet!: (response: Response) => void;
    const fetchMock = stubApi((request) => {
      if (request.method !== "GET") return null;
      // 붙잡아 둔 GET — 로딩 게이트 관찰
      return new Promise<Response>((resolve) => {
        resolveGet = resolve;
      });
    });
    renderPanel();

    // DotsLoader는 role="status" + aria-label — 텍스트 노드가 아니다
    expect(
      screen.getByRole("status", { name: "알림 설정 불러오는 중" }),
    ).toBeTruthy();
    expect(screen.queryAllByRole("switch")).toHaveLength(0);

    // fetch 발사는 비동기 — GET이 실제로 나간 뒤에 응답을 풀어준다
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    resolveGet(envelopeResponse({ preferences: SERVER_PREFERENCES }));

    expect(
      await screen.findByRole("switch", { name: "뱃지 획득" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "알림 설정 불러오는 중" }),
    ).toBeNull();
  });

  it("그룹 2개가 매핑 표 순서·라벨로 표시되고 각 토글이 서버 값을 반영한다 (AC 4·5)", async () => {
    stubApi();
    renderPanel();
    await screen.findByRole("switch", { name: "뱃지 획득" });

    expect(screen.getByRole("heading", { name: "활동 알림" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "소식" })).toBeTruthy();
    // 라벨 5종이 각 스위치의 접근 가능한 이름이다 — 그룹 내 순서·라벨 정본은
    // preference-catalog.test가 고정(AC 4), 여기서는 화면 배선과 서버 값 반영만 본다.
    // WEEKLY 라벨 "주간 리포트"는 결정 1 — 시안 "마케팅 · 혜택 정보" 기각
    expect(screen.getAllByRole("switch")).toHaveLength(5);
    // 서버 off 2종(소식)만 꺼짐, 누락(활동 3종)은 기본 on (AC 5)
    expect(switchOf("내 격자에 새 영상").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(switchOf("뱃지 획득").getAttribute("aria-checked")).toBe("true");
    expect(switchOf("스트릭 리마인더").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(switchOf("지역 축제 · 팝업").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(switchOf("주간 리포트").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("한 주의 수집 활동 요약을 주 1회")).toBeTruthy();
    expect(
      screen.getByText(
        "신고 처리 결과와 계정 관련 안내는 설정과 무관하게 발송됩니다.",
      ),
    ).toBeTruthy();
  });

  it("토글 클릭 시 PATCH가 해당 카테고리로 발사되고 UI는 즉시 전환된다 (AC 6 화면 배선)", async () => {
    const fetchMock = stubApi();
    renderPanel();
    await screen.findByRole("switch", { name: "뱃지 획득" });

    fireEvent.click(switchOf("뱃지 획득"));

    expect(switchOf("뱃지 획득").getAttribute("aria-checked")).toBe("false");
    await waitFor(() => {
      const patch = fetchMock.mock.calls
        .map(([request]) => request)
        .find((request) => request.method === "PATCH");
      expect(patch && new URL(patch.url).pathname).toBe(
        "/api/notifications/preferences/BADGE",
      );
    });
  });

  it("미지원 브라우저(jsdom 기본)에서는 배너가 CTA 없는 안내고, 카테고리 토글은 정상 동작한다 (AC 10)", async () => {
    stubApi();
    renderPanel();
    await screen.findByRole("switch", { name: "뱃지 획득" });

    expect(screen.getByText("브라우저 알림이 꺼져 있어요")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /허용하기/ })).toBeNull();
    expect(screen.getByText("미지원 브라우저")).toBeTruthy();
    // 서버 설정은 브라우저 푸시 지원과 독립 — 토글 조작 가능 (추정 4)
    expect(switchOf("뱃지 획득").disabled).toBe(false);
  });

  it("지원 브라우저에서 수신 불가면 '허용하기' CTA가 있고, 클릭은 408 ON 플로우(권한 요청)를 실행한다 (AC 9)", async () => {
    vi.mocked(readPushCapabilities).mockReturnValue({
      hasNotification: true,
      hasServiceWorker: true,
      hasPushManager: true,
    });
    vi.mocked(getPermission).mockReturnValue("default");
    stubApi();
    renderPanel();
    await screen.findByRole("switch", { name: "뱃지 획득" });

    const cta = screen.getByRole("button", { name: "허용하기 ›" });
    fireEvent.click(cta);

    // 제스처 컨텍스트 권한 요청 → 토큰 등록은 use-push-toggle 테스트가 고정 — 배선만 본다
    await waitFor(() => expect(requestPermission).toHaveBeenCalledTimes(1));
  });

  it("수신 가능 상태(권한 granted + 보관 토큰)면 배너가 렌더되지 않는다 (AC 9)", async () => {
    vi.mocked(readPushCapabilities).mockReturnValue({
      hasNotification: true,
      hasServiceWorker: true,
      hasPushManager: true,
    });
    vi.mocked(getPermission).mockReturnValue("granted");
    fcmTokenStorage.save("tok-1");
    stubApi();
    renderPanel();
    await screen.findByRole("switch", { name: "뱃지 획득" });

    expect(screen.queryByText("브라우저 알림이 꺼져 있어요")).toBeNull();
  });

  it("조회 실패 시 오류 게이트(제목+안내+[다시 시도])가 뜨고 재시도로 복구된다 (AC 11)", async () => {
    let failNext = true;
    stubApi((request) => {
      if (request.method !== "GET") return null;
      if (failNext) {
        failNext = false;
        return new Response(null, { status: 500 });
      }
      return null; // 기본 성공 응답
    });
    renderPanel();

    expect(
      await screen.findByText("알림 설정을 불러오지 못했어요"),
    ).toBeTruthy();
    expect(screen.queryAllByRole("switch")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByRole("switch", { name: "뱃지 획득" }),
    ).toBeTruthy();
  });

  it("헤더 '‹'(뒤로) 클릭 시 /profile로 복귀한다 (AC 2)", async () => {
    stubApi();
    renderPanel();
    await screen.findByRole("switch", { name: "뱃지 획득" });

    fireEvent.click(screen.getByRole("button", { name: "뒤로" }));

    expect(screen.getByTestId("location").textContent).toBe("/profile");
  });
});
