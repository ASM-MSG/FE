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
import { useProcessingStore } from "@/features/upload/model/processing-store";
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

const stubApi = (overrides?: {
  highlights?: number[][] | null;
  holdAnalysis?: boolean;
}) => {
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
      if (url.pathname === "/api/videos") {
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

const nextButton = () =>
  screen.getByRole("button", { name: "다음" }) as HTMLButtonElement;

// 스토어 갱신은 React 밖 호출이라 act로 감싸 렌더를 flush한다
const openModal = () => act(() => useUploadModalStore.getState().openModal());

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
    useProcessingStore.setState({ pending: [] });
    // C9 게이트(develop 머지) 도입으로 위저드 열림은 로그인 상태가 전제 — 기존 흐름 단정은 불변.
    // 잔존 의도(C10) 초기화를 로그인 전이보다 앞에 둬 스퓨리어스 재개를 막는다
    useUploadModalStore.setState({ open: false, pendingAfterLogin: false });
    useLoginModalStore.setState({ open: false });
    useAuthStore.setState({ accessToken: "token", isAuthenticated: true });
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

  it("highlights 없음(5초 이하): 하이라이트를 스킵하고 미리보기 직행 → 게시 → 완료 모달 + 대기 등록 (B4·B9·B13·B15)", async () => {
    stubApi({ highlights: [] });
    mockMeta.objectUrl = "blob:original";
    startFlow(4);

    // 하이라이트 미경유 — 바로 미리보기 (B4)
    expect(await screen.findByText("업로드 미리보기")).toBeTruthy();
    expect(screen.queryByText("AI 하이라이트 추천")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));

    // 완료 모달 — 티켓 확정 카피 (B13)
    expect(await screen.findByText("업로드 완료!")).toBeTruthy();
    expect(
      screen.getByText(
        "잠시 후 AI가 영상 블러 처리를 마치면 알림으로 알려드릴게요",
      ),
    ).toBeTruthy();
    // 확정 body의 좌표는 유한 수여야 한다 (B9) — NaN이면 JSON null로 직렬화돼 서버 400
    expect(Number.isFinite(lastConfirmBody?.lat)).toBe(true);
    expect(Number.isFinite(lastConfirmBody?.lng)).toBe(true);
    // 처리 대기 등록 (B15) — 워처 폴링의 입력
    expect(useProcessingStore.getState().pending.map((p) => p.videoId)).toEqual(
      [42],
    );
  });

  it("하이라이트 경유 게시: 구간 확정 → 트리밍 → 미리보기 → 게시 완료 (B7·B8·B9)", async () => {
    stubApi({ highlights: [[3, 8]] });
    mockMeta.objectUrl = "blob:original";
    startFlow(42);

    await screen.findByText("AI 하이라이트 추천");
    fireEvent.click(
      screen.getByRole("button", { name: "이 구간으로 다음 단계" }),
    );

    // 미리보기 — 잘린 결과(트리밍 목)가 준비되면 [업로드하기] 활성
    expect(await screen.findByText("업로드 미리보기")).toBeTruthy();
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "업로드하기",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    // 선택 구간 카드 — 시간·길이 중심 (오탐 방지 2)
    expect(screen.getByText(/0:03 – 0:08 · 5초/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "업로드하기" }));
    expect(await screen.findByText("업로드 완료!")).toBeTruthy();
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
});
