import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EventLocationVideoResponseDto } from "@/shared/api/generated/types.gen";
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

/**
 * 아카이브 위치 행 클릭 스모크 (MSG-535) — 행 button화·읽기 전용 위치 상세 전환·
 * 업로드 CTA 부재·헤더 타이틀 유지·뒤로가기 복귀만 고정한다. 모드 재판정 매트릭스는
 * event-room-mode 테스트가, 문구 파생·커서 로직은 features/event 로직 테스트가 커버한다.
 */
const archiveVideo = (videoId: number): EventLocationVideoResponseDto => ({
  videoId,
  thumbnailUrl: `https://cdn.example.com/thumb-${videoId}.jpg`,
  durationSec: 24,
  createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  helpfulCount: 18,
  commentCount: 6,
});

const VIDEOS_PATH = /^\/api\/event-occurrences\/7\/locations\/(\d+)\/videos$/;

const stubArchiveWithVideos = ({
  videos = [archiveVideo(1)],
  pendingVideos = false,
}: {
  videos?: EventLocationVideoResponseDto[];
  pendingVideos?: boolean;
} = {}) => {
  vi.stubGlobal(
    "fetch",
    vi.fn<(input: Request) => Promise<Response>>(async (request) => {
      const { pathname } = new URL(request.url);
      if (VIDEOS_PATH.test(pathname)) {
        if (pendingVideos) return new Promise<Response>(() => {});
        return envelopeResponse({ videos, hasNext: false, nextCursor: null });
      }
      if (pathname === ARCHIVE_LOCATIONS_PATH) {
        return envelopeResponse(ARCHIVE_LOCATIONS);
      }
      if (pathname === ARCHIVE_DETAIL_PATH) {
        return envelopeResponse(ARCHIVE_DETAIL);
      }
      return new Response(null, { status: 404 });
    }),
  );
};

/** 방을 열고 아카이브 위치 목록까지 기다린다 — back 단계 검증을 위해 스토어 방을 연다 */
const renderArchiveWithStore = async () => {
  useEventRoomStore.getState().open(ROOM);
  renderWithProviders(
    <EventRoomPanel
      room={ROOM}
      onBack={() => useEventRoomStore.getState().back()}
    />,
  );
  await screen.findByText("지난 행사 위치 2곳");
};

describe("아카이브 위치 행 클릭 — 읽기 전용 위치 상세 (MSG-535)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
  });

  it("위치 행이 시각 맥락을 포함한 접근명의 button으로 렌더된다 (AC 3)", async () => {
    stubArchiveWithVideos();

    await renderArchiveWithStore();

    expect(
      screen.getByRole("button", {
        name: "부산역 웰컴 팝업 당시 영상 보기 — 영상 12",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "서면 포켓몬 게임존 당시 영상 보기 — 영상 8",
      }),
    ).toBeTruthy();
  });

  it("행을 클릭하면 그 위치의 당시 영상 목록으로 전환되고 헤더·메타는 선택 스냅숏이다 (AC 4)", async () => {
    stubArchiveWithVideos();
    await renderArchiveWithStore();

    fireEvent.click(
      screen.getByRole("button", {
        name: "부산역 웰컴 팝업 당시 영상 보기 — 영상 12",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "부산역 웰컴 팝업" }),
    ).toBeTruthy();
    expect(screen.getByText("팝업")).toBeTruthy();
    expect(screen.getByText("영상 12 · 10:00~18:00")).toBeTruthy();
    expect(screen.getByText("이 위치의 행사 격자 3개")).toBeTruthy();
    expect(screen.getByText("♥ 18 · 댓글 6")).toBeTruthy();
  });

  it("아카이브 위치 상세(videos)에 업로드 CTA가 없다 (AC 5 — MSG-519 AC 7 관통)", async () => {
    stubArchiveWithVideos();
    await renderArchiveWithStore();

    fireEvent.click(
      screen.getByRole("button", {
        name: "부산역 웰컴 팝업 당시 영상 보기 — 영상 12",
      }),
    );
    await screen.findByRole("heading", { name: "부산역 웰컴 팝업" });

    expect(screen.queryByText("+ 영상 올리기")).toBeNull();
    expect(screen.queryByRole("button", { name: /올리|업로드/ })).toBeNull();
  });

  it("영상 0건 위치는 읽기 전용 빈 상태다 — 보관 맥락 문구 + CTA 부재 (AC 6)", async () => {
    stubArchiveWithVideos({ videos: [] });
    await renderArchiveWithStore();

    fireEvent.click(
      screen.getByRole("button", {
        name: "서면 포켓몬 게임존 당시 영상 보기 — 영상 8",
      }),
    );

    expect(
      await screen.findByText("이 위치에 남은 영상이 없어요"),
    ).toBeTruthy();
    expect(screen.getByText("행사 기간에 올라온 영상이 없었어요")).toBeTruthy();
    expect(screen.queryByText("현장 영상을 가장 먼저 남겨보세요")).toBeNull();
    expect(screen.queryByRole("button", { name: /올리|업로드/ })).toBeNull();
  });

  it("위치 상세에 들어가도 패널 헤더는 '지난 행사 기록'을 유지한다 (AC 7)", async () => {
    stubArchiveWithVideos();
    await renderArchiveWithStore();

    fireEvent.click(
      screen.getByRole("button", {
        name: "부산역 웰컴 팝업 당시 영상 보기 — 영상 12",
      }),
    );
    await screen.findByRole("heading", { name: "부산역 웰컴 팝업" });

    expect(
      screen.getByRole("heading", { name: "지난 행사 기록" }),
    ).toBeTruthy();
  });

  it("Escape 뒤로가기: 위치 상세 → 아카이브 개요 → 방 닫힘 — 기존 back() 단계 그대로 (AC 8)", async () => {
    stubArchiveWithVideos();
    await renderArchiveWithStore();
    fireEvent.click(
      screen.getByRole("button", {
        name: "부산역 웰컴 팝업 당시 영상 보기 — 영상 12",
      }),
    );
    await screen.findByRole("heading", { name: "부산역 웰컴 팝업" });

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useEventRoomStore.getState().location).toBeNull();
    expect(await screen.findByText("지난 행사 위치 2곳")).toBeTruthy();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useEventRoomStore.getState().room).toBeNull();
  });

  it("위치 영상 첫 페이지 로딩 동안 부분 렌더 없이 로더가 게이트한다 (AC 10)", async () => {
    stubArchiveWithVideos({ pendingVideos: true });
    await renderArchiveWithStore();

    fireEvent.click(
      screen.getByRole("button", {
        name: "부산역 웰컴 팝업 당시 영상 보기 — 영상 12",
      }),
    );

    expect(
      await screen.findByRole("status", { name: "현장 영상 불러오는 중" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "부산역 웰컴 팝업" }),
    ).toBeNull();
  });
});
