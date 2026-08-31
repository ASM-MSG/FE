import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { EventRoomOverview } from "./EventRoomOverview";

/**
 * 행사 위치 개요 스모크 (MSG-517 AC 1·3·9·10·11) — 헤더(행사명·시청 인원·기간)·위치 카드
 * (표시 전용)·안내 배너(행사명 보간)·실패 재시도 계약만 고정. 라벨 산술·폴링 주기·파생
 * 세부는 features/event 로직 테스트가 커버한다.
 */

const DETAIL_DTO = {
  occurrenceId: 7,
  seriesId: 1,
  title: "포켓몬 메가페스타 부산",
  startsAt: "2026-07-17T10:00:00",
  endsAt: "2026-08-09T21:00:00",
  uploadClosesAt: "2026-09-08T21:00:00",
  status: "LIVE",
  notificationOn: false,
  previousOccurrences: [],
};

const LOCATION_DTO = {
  locationId: 11,
  name: "부산역 웰컴 팝업",
  type: "POPUP",
  operatingHours: "10:00–20:00",
  gridIds: ["16846_11428"],
  representativeGridId: "16846_11428",
  zoneName: null,
  zoneCell: null,
  regionName: null,
  videoCount: 12,
  organizerName: null,
  description: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
  imageUrl: null,
};

const stubApis = ({ failDetail = false } = {}) => {
  const fetchSpy = vi.fn<(input: Request) => Promise<Response>>(
    async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/event-occurrences/7") {
        return failDetail
          ? errorEnvelope(13404, "not found", 404)
          : envelopeResponse(DETAIL_DTO);
      }
      if (pathname === "/api/event-occurrences/7/locations") {
        return envelopeResponse([LOCATION_DTO]);
      }
      if (pathname === "/api/event-occurrences/7/viewer-count") {
        return envelopeResponse({ viewerCount: 120 });
      }
      if (pathname === "/api/event-occurrences/7/heartbeat") {
        return envelopeResponse(null);
      }
      return envelopeResponse(null, 404);
    },
  );
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
};

describe("행사 위치 개요 (MSG-517)", () => {
  beforeEach(() => {
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
    useEventRoomStore.getState().open({
      occurrenceId: 7,
      title: "포켓몬 메가페스타 부산",
      status: "LIVE",
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("행사명·기간·시청 인원·위치 목록·안내 배너가 렌더된다 (AC 1·3·11)", async () => {
    stubApis();
    renderWithProviders(<EventRoomOverview />);

    expect(
      await screen.findByRole("heading", { name: "포켓몬 메가페스타 부산" }),
    ).toBeTruthy();
    expect(screen.getByText("7.17–8.9")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("120명 보는 중")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "행사 위치 1곳" })).toBeTruthy();
    expect(
      screen.getByText("파란 격자는 포켓몬 메가페스타 부산 관련 장소예요"),
    ).toBeTruthy();
  });

  it("위치 카드는 이름·메타·영상 배지를 보이되 표시 전용이다 — 버튼 아님 (AC 9, 추정 6)", async () => {
    stubApis();
    renderWithProviders(<EventRoomOverview />);

    expect(await screen.findByText("부산역 웰컴 팝업")).toBeTruthy();
    expect(screen.getByText("팝업 · 10:00–20:00")).toBeTruthy();
    expect(screen.getByText("영상 12")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /부산역 웰컴 팝업/ }),
    ).toBeNull();
  });

  it("조회 실패 시 재시도 행이 뜨고 재시도로 복구된다 (AC 10)", async () => {
    const fetchSpy = stubApis({ failDetail: true });
    renderWithProviders(<EventRoomOverview />);

    const retry = await screen.findByRole("button", { name: "다시 시도" });
    // 복구 — 이후 응답은 성공으로 전환
    fetchSpy.mockImplementation(async (request: Request) => {
      const { pathname } = new URL(request.url);
      if (pathname === "/api/event-occurrences/7")
        return envelopeResponse(DETAIL_DTO);
      if (pathname === "/api/event-occurrences/7/locations")
        return envelopeResponse([LOCATION_DTO]);
      return envelopeResponse({ viewerCount: null });
    });
    fireEvent.click(retry);

    expect(
      await screen.findByRole("heading", { name: "포켓몬 메가페스타 부산" }),
    ).toBeTruthy();
  });
});
