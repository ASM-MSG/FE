import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { envelopeResponse } from "@/test/envelope-response";

/**
 * 업로드 위저드 핵심 흐름 스모크 (MSG-163 승격 → MSG-329 재설계).
 * 구 4단계(블러 스텝 포함)·로컬 5초 분기 흐름은 디자인 ver 11에서 폐기됐다 — 신 3단계
 * (선택 → 선분석 로딩 → 하이라이트 → 미리보기) + API 스텁 기반으로 재설계했다.
 * 플랫폼 seam 2곳만 목킹한다: useVideoDuration(미디어 메타데이터)·ffmpeg-trim(wasm은
 * jsdom 실행 불가 — 스펙 검증 방법 명시). 나머지는 fetch 스텁의 실 요청으로 검증한다.
 */
const mockMeta = vi.hoisted(() => ({
  duration: null as number | null,
  objectUrl: null as string | null,
  error: false,
}));

vi.mock("./use-video-duration", () => ({
  useVideoDuration: (file: File | null) =>
    file
      ? {
          duration: mockMeta.duration,
          objectUrl: mockMeta.objectUrl,
          error: mockMeta.error,
        }
      : { duration: null, objectUrl: null, error: false },
}));

// wasm 실행 불가 — 어댑터 인터페이스만 목킹, 끝점 보정 로직은 video-trim 단위 테스트가 커버
vi.mock("../api/ffmpeg-trim", () => ({
  trimToSegment: vi.fn(
    async (_file: File, segment: { start: number; end: number }) => ({
      blob: new Blob(["trimmed"], { type: "video/mp4" }),
      durationSec: segment.end - segment.start,
    }),
  ),
}));

import { UploadModal } from "./UploadModal";

const PRESIGN_DATA = {
  uploadUrl: "https://bucket.s3.example.com/put?sig=abc",
  s3Key: "videos/pending/1/key.mp4",
  expiresInSec: 600,
};

const UPLOAD_RESULT = {
  videoId: 42,
  gridId: "grid-77",
  processingStatus: "UPLOADED",
  occupied: true,
  newBadges: [],
  completedMissions: [],
  zoneName: "서면",
  zoneCell: "A-14",
  regionName: "부산 부산진구 부전동",
};

/** fetch 목 — hey-api(Request)·S3 PUT(url+init) 두 형태를 pathname 라우팅한다 */
/** 마지막 확정(POST /api/videos) 요청 body — lat/lng 유한성 단정용 (NaN은 JSON null → 서버 400) */
let lastConfirmBody: Record<string, unknown> | null = null;
/** 마지막 교체 확정(PUT /api/videos/42) 요청 body — lat·lng 미전송 단정용 (MSG-415 AC 3) */
let lastReplaceBody: Record<string, unknown> | null = null;

const stubApi = (overrides?: {
  highlights?: number[][] | null;
  holdAnalysis?: boolean;
  /** 확정(POST /api/videos)을 앞에서 n회 실패시킨다 — 재게시 정합 시나리오용 */
  failConfirmTimes?: number;
}) => {
  let confirmFailures = overrides?.failConfirmTimes ?? 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname === "/api/regions/reverse-geocode") {
        return envelopeResponse({
          regionCode: "2644056000",
          regionName: "부산 부산진구 부전동",
          parentCode: "26440",
        });
      }
      if (url.pathname === "/api/videos/presigned-url") {
        return envelopeResponse(PRESIGN_DATA);
      }
      if (url.hostname === "bucket.s3.example.com") {
        return new Response(null, { status: 200 });
      }
      if (url.pathname === "/api/videos/highlight-preview") {
        if (overrides?.holdAnalysis) {
          return new Promise<Response>(() => {}); // 응답 보류 — 로딩 중 상태 고정
        }
        return envelopeResponse({
          highlights: overrides?.highlights ?? [[3, 8]],
        });
      }
      // 교체 확정 — PUT /api/videos/{videoId} (MSG-415)
      if (
        url.pathname === "/api/videos/42" &&
        input instanceof Request &&
        input.method === "PUT"
      ) {
        lastReplaceBody = (await input.clone().json()) as Record<
          string,
          unknown
        >;
        return envelopeResponse({ videoId: 42, processingStatus: "UPLOADED" });
      }
      if (url.pathname === "/api/videos") {
        if (confirmFailures > 0) {
          confirmFailures -= 1;
          return new Response(
            JSON.stringify({ developCode: 500, message: "실패", data: null }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        lastConfirmBody =
          input instanceof Request
            ? ((await input.clone().json()) as Record<string, unknown>)
            : null;
        return envelopeResponse(UPLOAD_RESULT);
      }
      throw new Error(`예상 밖 요청: ${url.href}`);
    }),
  );
};

/** S3 PUT 호출 수 — 재게시 정합 단정용 (원본·확정 업로드 모두 같은 버킷 호스트) */
/** [이 구간으로 다음 단계] → 미리보기 진입 + 트리밍 완료([업로드하기] 활성) 대기 */
const proceedToPreviewReady = async () => {
  fireEvent.click(
    screen.getByRole("button", { name: "이 구간으로 다음 단계" }),
  );
  await waitFor(() =>
    expect(
      (screen.getByRole("button", { name: "업로드하기" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false),
  );
};

const countS3Puts = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter((call) =>
      String(call[0] instanceof Request ? call[0].url : call[0]).includes(
        "bucket.s3.example.com",
      ),
    ).length;

const nextButton = () =>
  screen.getByRole("button", { name: "다음" }) as HTMLButtonElement;

// 스토어 갱신은 React 밖 호출이라 act로 감싸 렌더를 flush한다
const openModal = () => act(() => useUploadModalStore.getState().openModal());

/** 교체 모드 진입 — 내 영상 더보기 [영상 교체]가 넘기는 대상 (MSG-415) */
const openReplaceModal = () =>
  act(() =>
    useUploadModalStore.getState().openReplaceModal({
      videoId: 42,
      gridId: "grid-77",
      zoneName: "서면",
      zoneCell: "A-02",
    }),
  );

/** 교체 PUT(/api/videos/42) 발사 횟수 — 확정 전 미발사 단정용 (AC 7·8) */
const countReplacePuts = () =>
  vi.mocked(fetch).mock.calls.filter((call) => {
    const input = call[0] as RequestInfo | URL;
    return (
      input instanceof Request &&
      input.method === "PUT" &&
      new URL(input.url).pathname === "/api/videos/42"
    );
  }).length;

const selectValidFile = () => {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error("파일 input이 렌더되지 않음");
  fireEvent.change(input, {
    target: { files: [new File(["v"], "clip.mp4", { type: "video/mp4" })] },
  });
};

/** 공통 진입 — 열기 → 파일 선택 → [다음] (시나리오별 duration만 다르다) */
const startFlow = (duration: number) => {
  mockMeta.duration = duration;
  openModal();
  selectValidFile();
  fireEvent.click(nextButton());
};

describe("업로드 위저드 흐름 스모크 (MSG-329)", () => {
  beforeEach(() => {
    localStorage.clear();
    // C9 게이트(develop 머지) 도입으로 위저드 열림은 로그인 상태가 전제 — 기존 흐름 단정은 불변.
    // 잔존 의도(C10) 초기화를 로그인 전이보다 앞에 둬 스퓨리어스 재개를 막는다
    useUploadModalStore.setState({
      open: false,
      pendingAfterLogin: false,
      replaceTarget: null,
    });
    useLoginModalStore.setState({ open: false });
    useAuthStore.setState({ accessToken: "token", isAuthenticated: true });
    lastConfirmBody = null;
    lastReplaceBody = null;
    mockMeta.duration = null;
    mockMeta.objectUrl = null;
    mockMeta.error = false;
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <UploadModal />
      </QueryClientProvider>,
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("파일 선택 전에는 '다음'이 비활성이고, 유효 파일 + duration 확정 시 활성화된다", () => {
    stubApi();
    mockMeta.duration = 42;
    openModal();

    expect(nextButton().disabled).toBe(true);
    selectValidFile();
    expect(nextButton().disabled).toBe(false);
  });

  it("180초 초과 영상은 사유가 표시되고 '다음'이 비활성이다 (B1)", () => {
    stubApi();
    mockMeta.duration = 200;
    openModal();
    selectValidFile();

    expect(screen.getByText(/최대 180초까지 올릴 수 있어요/)).toBeTruthy();
    expect(nextButton().disabled).toBe(true);
  });

  it("위치 태그는 뷰포트 중심의 행정동 라벨이다 — mock 'A-14' 부재 (B2)", async () => {
    stubApi();
    mockMeta.duration = 42;
    openModal();

    expect(await screen.findByText("부산 부산진구 부전동")).toBeTruthy();
    expect(screen.queryByText(/A-14/)).toBeNull();
  });

  it("[다음] → 선분석 → 하이라이트: 서버 추천 개수만큼 카드가 뜨고 첫 번째가 기본 선택된다 (B3·B6)", async () => {
    stubApi({
      highlights: [
        [3, 8],
        [12, 18],
      ],
    });
    startFlow(42);

    expect(await screen.findByText("AI 하이라이트 추천")).toBeTruthy();
    const cards = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("aria-pressed"));
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute("aria-pressed")).toBe("true");
    // 카드는 시간 정보 중심 표기 — 사유 라벨 없음 (B6, 오탐 방지 1)
    expect(cards[0].textContent).toContain("0:03 – 0:08 · 5초");
    expect(screen.queryByText(/움직임·밝기 지속/)).toBeNull();
  });

  it("선분석 진행 중에는 로딩 문구가 보이고 ESC로 닫히지 않는다 (B3·B12)", async () => {
    stubApi({ holdAnalysis: true });
    startFlow(42);

    expect(await screen.findByText("잠시만 기다려주세요")).toBeTruthy();
    expect(
      screen.getByText(
        /AI가 영상을 분석해 하이라이트 추천 구간을 생성하고 있어요/,
      ),
    ).toBeTruthy();
    // 확정 시간 안내 금지 — "수 초~수십 초" (티켓 11)
    expect(screen.getByText(/수 초~수십 초/)).toBeTruthy();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(useUploadModalStore.getState().open).toBe(true);
    expect(screen.getByText("잠시만 기다려주세요")).toBeTruthy();
  });

  it("highlights 없음(5초 이하): 미리보기 직행 → 무조작 게시 시 visibility PUBLIC 명시 전송 + 완료 모달, 블러 대기 등록 없음 (B4·B9, MSG-476 AC 2·5·7)", async () => {
    stubApi({ highlights: [] });
    mockMeta.objectUrl = "blob:original";
    startFlow(4);

    // 하이라이트 미경유 — 바로 미리보기 (B4)
    expect(await screen.findByText("업로드 미리보기")).toBeTruthy();
    expect(screen.queryByText("AI 하이라이트 추천")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));

    // 완료 모달 — 블러 안내 폐기, 확정 카피 (MSG-476 AC 5)
    expect(await screen.findByText("업로드 완료!")).toBeTruthy();
    expect(
      screen.getByText("영상이 지도에 등록됐어요. 내 격자에서 확인해보세요"),
    ).toBeTruthy();
    expect(screen.queryByText(/블러/)).toBeNull();
    // 확정 body의 좌표는 유한 수여야 한다 (B9) — NaN이면 JSON null로 직렬화돼 서버 400
    expect(Number.isFinite(lastConfirmBody?.lat)).toBe(true);
    expect(Number.isFinite(lastConfirmBody?.lng)).toBe(true);
    // 무조작 게시 = 기본값 PUBLIC 명시 전송 (AC 2, 추정 2)
    expect(lastConfirmBody?.visibility).toBe("PUBLIC");
    // 블러 폴링 폐기 — 처리 대기 등록이 일어나지 않는다 (AC 7)
    expect(localStorage.getItem("fillmap.upload.pending:v1")).toBeNull();
  });

  it("미리보기 공개 범위는 '전체 공개'가 기본이고, '나만 보기' 선택 후 게시하면 visibility PRIVATE가 실린다 (MSG-476 AC 1·2·9)", async () => {
    stubApi({ highlights: [] });
    mockMeta.objectUrl = "blob:original";
    startFlow(4);
    await screen.findByText("업로드 미리보기");

    // 라디오 그룹 의미 + 기본 선택 (AC 1·9)
    expect(screen.getByRole("radiogroup", { name: "공개 범위" })).toBeTruthy();
    expect(
      screen
        .getByRole("radio", { name: "전체 공개" })
        .getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: "나만 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));

    await screen.findByText("업로드 완료!");
    expect(lastConfirmBody?.visibility).toBe("PRIVATE");
  });

  it("'나만 보기' 선택 후 [이전 단계로] 갔다가 다시 미리보기에 오면 선택이 유지된다 (MSG-476 AC 3)", async () => {
    stubApi({ highlights: [[3, 8]] });
    mockMeta.objectUrl = "blob:original";
    startFlow(42);
    await screen.findByText("AI 하이라이트 추천");
    await proceedToPreviewReady();

    fireEvent.click(screen.getByRole("radio", { name: "나만 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "이전 단계로" }));
    await screen.findByText("AI 하이라이트 추천");
    await proceedToPreviewReady();

    expect(
      screen
        .getByRole("radio", { name: "나만 보기" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("완료 후 재오픈한 다음 업로드의 공개 범위는 '전체 공개'로 초기화된다 (MSG-476 AC 4)", async () => {
    stubApi({ highlights: [] });
    mockMeta.objectUrl = "blob:original";
    startFlow(4);
    await screen.findByText("업로드 미리보기");
    fireEvent.click(screen.getByRole("radio", { name: "나만 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));
    await screen.findByText("업로드 완료!");
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    openModal();
    selectValidFile();
    fireEvent.click(nextButton());
    await screen.findByText("업로드 미리보기");

    expect(
      screen
        .getByRole("radio", { name: "전체 공개" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("1/3 선택 스텝에 '업로드 후 AI 자동 블러' 안내 박스가 없다 (MSG-476 AC 6)", () => {
    stubApi();
    mockMeta.duration = 42;
    openModal();
    selectValidFile();

    expect(screen.queryByText("업로드 후 AI 자동 블러")).toBeNull();
    expect(screen.queryByText(/게시 후 얼굴과 번호판/)).toBeNull();
    // 하이라이트 안내는 존치 — 티켓 제외 범위 (추정 5)
    expect(screen.getByText("AI 하이라이트 자동 추천")).toBeTruthy();
  });

  it("하이라이트 경유 게시: 구간 확정 → 트리밍 → 미리보기 → 게시 완료 (B7·B8·B9)", async () => {
    stubApi({ highlights: [[3, 8]] });
    mockMeta.objectUrl = "blob:original";
    startFlow(42);

    await screen.findByText("AI 하이라이트 추천");
    // 미리보기 — 잘린 결과(트리밍 목)가 준비되면 [업로드하기] 활성
    await proceedToPreviewReady();
    expect(screen.getByText("업로드 미리보기")).toBeTruthy();
    // 선택 구간 카드 — 시간·길이 중심 (오탐 방지 2)
    expect(screen.getByText(/0:03 – 0:08 · 5초/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));
    expect(await screen.findByText("업로드 완료!")).toBeTruthy();
  });

  it("게시 실패 후 [이전 단계로]에서 다른 구간을 골라 재게시하면 새 구간이 처음부터 다시 업로드된다 (리뷰 반영 — 옛 s3Key 확정 방지)", async () => {
    stubApi({
      highlights: [
        [3, 8],
        [12, 18],
      ],
      failConfirmTimes: 1,
    });
    mockMeta.objectUrl = "blob:original";
    startFlow(42);

    // 구간 A로 게시 시도 — 확정만 실패 (presign·S3 PUT은 성공)
    await screen.findByText("AI 하이라이트 추천");
    await proceedToPreviewReady();
    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));
    await screen.findByText(/게시에 실패했어요|실패/);

    const s3PutsAfterFailure = countS3Puts(); // 원본 1 + 구간 A 1 = 2

    // 이전 단계로 → 다른 구간 B 선택 → 재게시
    fireEvent.click(screen.getByRole("button", { name: "이전 단계로" }));
    await screen.findByText("AI 하이라이트 추천");
    const cards = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("aria-pressed"));
    fireEvent.click(cards[1]);
    await proceedToPreviewReady();
    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));
    expect(await screen.findByText("업로드 완료!")).toBeTruthy();

    // 새 구간(B)이 실제로 다시 업로드됐어야 한다 — S3 PUT이 1회 추가 (옛 s3Key 재사용 금지)
    const s3PutsAfterRepublish = countS3Puts();
    expect(s3PutsAfterRepublish).toBe(s3PutsAfterFailure + 1);
  });

  it("완료 모달 [확인] 후 재오픈하면 1단계 초기 상태다", async () => {
    stubApi({ highlights: [] });
    startFlow(4);
    await screen.findByText("업로드 미리보기");
    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));
    await screen.findByText("업로드 완료!");

    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(useUploadModalStore.getState().open).toBe(false);

    openModal();
    expect(screen.getAllByText("영상 업로드").length).toBeGreaterThan(0);
    expect(screen.queryByText("clip.mp4")).toBeNull();
    expect(nextButton().disabled).toBe(true);
  });

  it("교체 모드: 같은 스텝열 완주 후 [교체하기]로 PUT /api/videos/{videoId}가 발사되고 body에 lat·lng가 없다 — 완료 모달 '교체 완료!' (MSG-415 AC 2·3, 추정 3)", async () => {
    stubApi({ highlights: [] });
    mockMeta.objectUrl = "blob:original";
    mockMeta.duration = 4;
    openReplaceModal();
    selectValidFile();
    fireEvent.click(nextButton());

    // 기존 스텝열 그대로 — 미리보기 도달 (AC 2)
    expect(await screen.findByText("업로드 미리보기")).toBeTruthy();
    // 교체 모드에는 공개 범위 선택이 없다 (MSG-476 AC 11)
    expect(screen.queryByRole("radiogroup", { name: "공개 범위" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "교체하기" }));

    expect(await screen.findByText("교체 완료!")).toBeTruthy();
    expect(
      screen.getByText("영상이 지도에 등록됐어요. 내 격자에서 확인해보세요"),
    ).toBeTruthy();
    // 확정은 PUT 교체 1회 — 일반 업로드 POST는 발사되지 않는다 (AC 6 모드 격리)
    expect(countReplacePuts()).toBe(1);
    expect(lastConfirmBody).toBeNull();
    expect(lastReplaceBody).toMatchObject({ s3Key: PRESIGN_DATA.s3Key });
    expect(lastReplaceBody).not.toHaveProperty("lat");
    expect(lastReplaceBody).not.toHaveProperty("lng");
    // 교체 body에 visibility 없음 — DTO에 필드가 없다 (MSG-476 AC 11)
    expect(lastReplaceBody).not.toHaveProperty("visibility");
    // 블러 폴링 폐기 — 교체도 처리 대기 등록이 없다 (MSG-476 AC 7)
    expect(localStorage.getItem("fillmap.upload.pending:v1")).toBeNull();
  });

  it("교체 모드 위치 라벨은 대상 영상의 격자 라벨('서면 A-02')이다 — 지도 중심 행정동 아님 (MSG-415 추정 1)", async () => {
    stubApi();
    mockMeta.duration = 42;
    openReplaceModal();

    expect(await screen.findByText("서면 A-02")).toBeTruthy();
    expect(screen.queryByText("부산 부산진구 부전동")).toBeNull();
  });

  it("교체 모드 위저드를 확정 전에 닫으면 교체 PUT이 발사되지 않고, 이어지는 일반 업로드는 POST /api/videos(lat·lng 포함)로 간다 (MSG-415 AC 6·7)", async () => {
    stubApi({ highlights: [] });
    mockMeta.objectUrl = "blob:original";
    mockMeta.duration = 4;
    openReplaceModal();
    selectValidFile();
    fireEvent.click(nextButton());
    await screen.findByText("업로드 미리보기");
    await screen.findByRole("button", { name: "교체하기" });

    // 확정 직전 닫기 (✕) — 쓰기(교체 PUT) 미발사 + 교체 대상 해제 (AC 7)
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(useUploadModalStore.getState().open).toBe(false);
    expect(useUploadModalStore.getState().replaceTarget).toBeNull();
    expect(countReplacePuts()).toBe(0);

    // 이어지는 일반 업로드 — 교체로 오발사되지 않는다 (AC 6)
    openModal();
    selectValidFile();
    fireEvent.click(nextButton());
    await screen.findByText("업로드 미리보기");
    fireEvent.click(await screen.findByRole("button", { name: "업로드하기" }));

    expect(await screen.findByText("업로드 완료!")).toBeTruthy();
    expect(countReplacePuts()).toBe(0);
    expect(Number.isFinite(lastConfirmBody?.lat)).toBe(true);
    expect(Number.isFinite(lastConfirmBody?.lng)).toBe(true);
  });
});
