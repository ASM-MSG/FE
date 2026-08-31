import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ARCHIVE_DETAIL,
  ARCHIVE_DETAIL_PATH,
  ARCHIVE_LOCATIONS,
  ARCHIVE_LOCATIONS_PATH,
} from "@/test/event-archive-fixture";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { envelopeResponse } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { EventRoomPanel } from "./EventRoomPanel";

/**
 * 종료 행사 아카이브 스모크 (MSG-519) — 아카이브 렌더 계약(헤더 전환·행사명·기간·위치 목록·
 * 보관 카드·업로드 CTA 부재·로딩/실패 복구)과 활성 방 회귀만 고정. 모드 판정·기간 포맷 값은
 * features/event 로직 테스트가 커버한다. 문구는 스펙 확정 문자열이라 단정 대상이다.
 */

/** 캡슐 세그먼트에서 받는 최소 참조 — 칩 status는 2값뿐이라 아카이브 판정은 상세가 정본 */
const ROOM = {
  occurrenceId: 7,
  title: "포켓몬 메가페스타 부산",
  status: "LIVE" as const,
};

const stubArchiveApis = ({
  detail = ARCHIVE_DETAIL,
  failDetailOnce = false,
  failLocationsOnce = false,
  pending = false,
  pendingLocations = false,
}: {
  detail?: typeof ARCHIVE_DETAIL;
  failDetailOnce?: boolean;
  failLocationsOnce?: boolean;
  pending?: boolean;
  pendingLocations?: boolean;
} = {}) => {
  // 첫 호출만 실패시키는 스텁 — 재시도 복구 계약(AC 9) 검증용
  let detailFailed = false;
  let locationsFailed = false;
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (pending) return new Promise<Response>(() => {});
      if (pathname === ARCHIVE_LOCATIONS_PATH) {
        if (pendingLocations) return new Promise<Response>(() => {});
        if (failLocationsOnce && !locationsFailed) {
          locationsFailed = true;
          return new Response(null, { status: 500 });
        }
        return envelopeResponse(ARCHIVE_LOCATIONS);
      }
      if (pathname === ARCHIVE_DETAIL_PATH) {
        if (failDetailOnce && !detailFailed) {
          detailFailed = true;
          return new Response(null, { status: 500 });
        }
        return envelopeResponse(detail);
      }
      return new Response(null, { status: 404 });
    }),
  );
};

/** 방을 열고 아카이브 헤더 전환(상세 도착)까지 기다린다 — 스텁은 케이스별로 선행 준비 */
const renderArchiveRoom = async () => {
  renderWithProviders(<EventRoomPanel room={ROOM} onBack={() => {}} />);
  return screen.findByRole("heading", { name: "지난 행사 기록" });
};

describe("종료 행사 아카이브 본문 (MSG-519)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    // 개요(자급 컨테이너) 테스트가 여는 행사방을 단정 실패 경로에서도 확실히 걷는다
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
  });

  it("종료 행사(UPLOAD_GRACE) 방은 '지난 행사 기록' 헤더 + 행사명 + 기간 라벨로 렌더된다 (AC 3)", async () => {
    stubArchiveApis();

    expect(await renderArchiveRoom()).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "포켓몬 메가페스타 부산" }),
    ).toBeTruthy();
    expect(screen.getByText("2026.7.17–8.9")).toBeTruthy();
  });

  it("'지난 행사 위치 N곳' 헤더 + 안내 문구 + 위치 행(이름·영상 N, 서버 정렬)이 렌더된다 (AC 5)", async () => {
    stubArchiveApis();

    renderWithProviders(<EventRoomPanel room={ROOM} onBack={() => {}} />);

    expect(await screen.findByText("지난 행사 위치 2곳")).toBeTruthy();
    expect(
      screen.getByText("위치를 선택하면 당시 영상을 볼 수 있어요"),
    ).toBeTruthy();
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "부산역 웰컴 팝업영상 12",
      "서면 포켓몬 게임존영상 8",
    ]);
  });

  it("보관 안내 카드가 렌더된다 (AC 6)", async () => {
    stubArchiveApis();

    renderWithProviders(<EventRoomPanel room={ROOM} onBack={() => {}} />);

    expect(
      await screen.findByText("이 행사방은 기록 보관 중이에요"),
    ).toBeTruthy();
    expect(
      screen.getByText("영상과 댓글은 볼 수 있지만 새 영상은 올릴 수 없어요"),
    ).toBeTruthy();
  });

  it("아카이브 본문에 업로드 유도 UI가 없다 — '올리기'류 CTA·버튼 0 (AC 7)", async () => {
    stubArchiveApis();

    const { container } = renderWithProviders(
      <EventRoomPanel room={ROOM} onBack={() => {}} />,
    );

    await screen.findByText("지난 행사 위치 2곳");
    expect(container.textContent).not.toContain("올리기");
    expect(container.textContent).not.toContain("업로드");
    expect(screen.queryByRole("button", { name: /올리|업로드/ })).toBeNull();
  });

  it("ARCHIVED(1개월 초과) 상세 도달도 그대로 아카이브로 렌더된다 (질문 2 A안)", async () => {
    stubArchiveApis({ detail: { ...ARCHIVE_DETAIL, status: "ARCHIVED" } });

    expect(await renderArchiveRoom()).toBeTruthy();
  });

  it("상세 조회 실패 시 재시도 UI가 뜨고, 재시도로 아카이브가 복구된다 (AC 9)", async () => {
    stubArchiveApis({ failDetailOnce: true });

    renderWithProviders(<EventRoomPanel room={ROOM} onBack={() => {}} />);

    expect(
      await screen.findByText("행사 정보를 불러오지 못했어요"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("지난 행사 위치 2곳")).toBeTruthy();
  });

  it("위치 조회 실패 시 재시도 UI가 뜨고, 재시도로 복구된다 (AC 9)", async () => {
    stubArchiveApis({ failLocationsOnce: true });

    renderWithProviders(<EventRoomPanel room={ROOM} onBack={() => {}} />);

    expect(
      await screen.findByText("지난 행사 기록을 불러오지 못했어요"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("지난 행사 위치 2곳")).toBeTruthy();
  });

  it("아카이브 판정 뒤 위치 조회가 끝나기 전에는 로딩 표시가 렌더된다 (AC 9)", async () => {
    stubArchiveApis({ pendingLocations: true });

    expect(await renderArchiveRoom()).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("상세 도착 전에는 칩 status 폴백으로 활성 셸이 유지된다 — 깜빡임 방지 (질문 3)", () => {
    stubArchiveApis({ pending: true });

    renderWithProviders(
      <EventRoomPanel
        room={{ ...ROOM, status: "UPCOMING" }}
        onBack={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: "이벤트" })).toBeTruthy();
  });

  it("회귀: 활성 행사(상세 LIVE) 방은 기존 '이벤트' 헤더 + 자리표시 그대로다 (AC 10)", async () => {
    stubArchiveApis({ detail: { ...ARCHIVE_DETAIL, status: "LIVE" } });
    // 개요 본문(MSG-517)은 자급 컨테이너라 스토어의 방을 읽는다 — 실사용 경로 재현
    useEventRoomStore.getState().open(ROOM);

    renderWithProviders(<EventRoomPanel room={ROOM} onBack={() => {}} />);

    expect(await screen.findByRole("heading", { name: "이벤트" })).toBeTruthy();
    // 자리표시는 MSG-517 개요 본문으로 교체됐다(웨이브 2 병렬 머지) — 활성 방은 개요 렌더
    expect(
      await screen.findByRole("heading", { name: "포켓몬 메가페스타 부산" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByText("지난 행사 기록")).toBeNull(),
    );
  });
});
