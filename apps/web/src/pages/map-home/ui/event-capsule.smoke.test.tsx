import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventCapsuleStore } from "@/features/event/model/event-capsule-store";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { SEOMYEON_CENTER } from "@/shared/geolocation";
import { envelopeResponse } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { EventCapsule } from "./EventCapsule";

/**
 * 행사 캡슐 스모크 (MSG-516) — 미렌더 판정·펼침·세그먼트 활성·✕ 일괄 닫기 계약만 고정.
 * 지역명 축약·D-day 산술·bbox 게이트 값은 features/event 로직 테스트가 커버한다.
 */

/** 역지오코딩 실측 형태(2026-08-31) — regionName은 전체 경로다 */
const BUSAN_REGION = {
  regionCode: "2644056000",
  regionName: "부산광역시 부산진구 부전2동",
  parentCode: "2644000000",
};

const EVENT_CHIPS = [
  {
    occurrenceId: 1,
    title: "부산 불꽃축제",
    cityName: "부산",
    startsAt: "2099-10-24T19:00:00",
    endsAt: "2099-10-24T21:00:00",
    status: "UPCOMING",
  },
  {
    occurrenceId: 2,
    title: "부산국제영화제",
    cityName: "부산",
    startsAt: "2099-10-01T10:00:00",
    endsAt: "2099-10-30T22:00:00",
    status: "LIVE",
  },
];

const READY_BOUNDS = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

const stubApis = (events: unknown[] = EVENT_CHIPS) => {
  const fetchSpy = vi.fn<(input: Request) => Promise<Response>>(
    async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/regions/reverse-geocode") {
        return envelopeResponse(BUSAN_REGION);
      }
      if (pathname === "/api/event-occurrences") {
        return envelopeResponse(events);
      }
      return envelopeResponse(null, 404);
    },
  );
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
};

const renderCapsule = () => {
  useViewportStore.setState({ bounds: READY_BOUNDS });
  return renderWithProviders(<EventCapsule />);
};

/** 접힘 캡슐 도착을 기다렸다 펼친다 — 펼침 이후 시나리오 공용 셋업 */
const expandCapsule = async () => {
  renderCapsule();
  fireEvent.click(
    await screen.findByRole("button", { name: "부산 행사 2건 펼치기" }),
  );
};

beforeEach(() => {
  useEventCapsuleStore.setState(useEventCapsuleStore.getInitialState(), true);
  useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useThemeFilterStore.setState({ activeTheme: null });
  useHomeCellDetailStore.setState({ selectedCellId: null });
  useViewportStore.setState({ bounds: null, center: SEOMYEON_CENTER });
});

describe("행사 캡슐 (MSG-516)", () => {
  it("행사가 없는 지역(빈 배열)이면 캡슐이 렌더되지 않는다 (AC 8)", async () => {
    const fetchSpy = stubApis([]);

    renderCapsule();

    await waitFor(() =>
      expect(
        fetchSpy.mock.calls.some(([request]) =>
          new URL(request.url).pathname.endsWith("/event-occurrences"),
        ),
      ).toBe(true),
    );
    expect(screen.queryByRole("button", { name: /행사/ })).toBeNull();
  });

  it("접힘 캡슐(축약 지역명+카운트)을 펼치면 행사 세그먼트가 뜬다 — UPCOMING은 D-day 동반, LIVE는 제목만 (AC 3·5·6)", async () => {
    stubApis();

    await expandCapsule();

    expect(
      await screen.findByRole("button", { name: /부산 불꽃축제 D-\d+/ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "부산국제영화제" })).toBeTruthy();
  });

  it("세그먼트를 클릭하면 활성 표시와 함께 행사방이 열리고 테마 칩·격자 상세는 걷힌다 (AC 9, 추정 6)", async () => {
    stubApis();
    useThemeFilterStore.setState({ activeTheme: "hot" });
    useHomeCellDetailStore.setState({ selectedCellId: "39064_112221" });
    await expandCapsule();

    fireEvent.click(
      await screen.findByRole("button", { name: /부산 불꽃축제/ }),
    );

    expect(useEventRoomStore.getState().room).toEqual({
      occurrenceId: 1,
      title: "부산 불꽃축제",
      status: "UPCOMING",
    });
    expect(useThemeFilterStore.getState().activeTheme).toBeNull();
    expect(useHomeCellDetailStore.getState().selectedCellId).toBeNull();
    expect(
      screen
        .getByRole("button", { name: /부산 불꽃축제/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("펼친 채 다른 시로 이동하면 캡슐이 접힘부터 다시 시작한다 — 컴포넌트가 항상 렌더라 스토어가 지역을 넘어 살아남는 경로 (AC 3, PR 리뷰 반영)", async () => {
    // 역지오코딩 응답을 테스트 중간에 바꿀 수 있는 가변 스텁
    let region = BUSAN_REGION;
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: Request) => Promise<Response>>(async (request) => {
        const { pathname } = new URL(request.url);
        if (pathname === "/api/regions/reverse-geocode") {
          return envelopeResponse(region);
        }
        if (pathname === "/api/event-occurrences") {
          return envelopeResponse(EVENT_CHIPS);
        }
        return envelopeResponse(null, 404);
      }),
    );
    await expandCapsule();
    await screen.findByRole("button", { name: /부산 불꽃축제/ });

    // 김해로 이동 — 시 라벨이 "부산"→"경남"으로 바뀐다 (bounds 불변 — 칩 목록은 그대로)
    region = {
      regionCode: "4833056000",
      regionName: "경상남도 김해시 장유3동",
      parentCode: "4833000000",
    };
    act(() => {
      useViewportStore.setState({ center: { lat: 35.19, lng: 128.808 } });
    });

    // 역지오코딩 디바운스(500ms) 소화 후 접힘 캡슐로 재시작해야 한다
    expect(
      await screen.findByRole(
        "button",
        { name: "경남 행사 2건 펼치기" },
        { timeout: 2_000 },
      ),
    ).toBeTruthy();
    expect(useEventCapsuleStore.getState().expanded).toBe(false);
  });

  it("머리의 ✕를 클릭하면 캡슐이 접히고 행사방도 함께 닫힌다 (AC 10)", async () => {
    stubApis();
    await expandCapsule();
    fireEvent.click(
      await screen.findByRole("button", { name: /부산 불꽃축제/ }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "부산 행사 목록 닫기" }),
    );

    expect(useEventCapsuleStore.getState().expanded).toBe(false);
    expect(useEventRoomStore.getState().room).toBeNull();
    expect(
      screen.getByRole("button", { name: "부산 행사 2건 펼치기" }),
    ).toBeTruthy();
  });
});
