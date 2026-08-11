import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useProcessingStore } from "@/features/upload/model/processing-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { pendingVideoStorage } from "@/shared/storage";
import { envelopeResponse } from "@/test/envelope-response";
import { UploadProcessingNotices } from "./UploadProcessingNotices";

/**
 * 블러 처리 통지 스모크 (MSG-329 B15·B16·B17) — AppLayout 상주 워처의 통지 배선.
 * 등록 직후 즉시 조회(checkNow)가 있어 fake timers 없이 전이를 관찰할 수 있다 —
 * 30초 간격·15분 상한 타이머 동작은 processing-poll 단위 테스트(fake timers)가 커버한다.
 */

const playback = (processingStatus: string, playbackUrl: string | null) => ({
  videoId: 42,
  playbackUrl,
  thumbnailUrl: null,
  gridId: "grid-77",
  durationSec: 8,
  processingStatus,
  visibility: "PUBLIC",
  status: "ACTIVE",
  viewCount: 0,
  recordedAt: "2026-08-11T09:00:00Z",
  expiresInSec: playbackUrl === null ? null : 600,
  zoneName: "서면",
  zoneCell: "A-14",
  regionName: "부산 부산진구 부전동",
  highlights: null,
});

const stubPlayback = (processingStatus: string, playbackUrl: string | null) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const url = new URL(input.url);
      if (url.pathname === "/api/videos/42") {
        return envelopeResponse(playback(processingStatus, playbackUrl));
      }
      throw new Error(`예상 밖 요청: ${url.href}`);
    }),
  );
};

const renderNotices = (client: QueryClient = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <UploadProcessingNotices />
    </QueryClientProvider>,
  );

const seedPending = () => {
  useProcessingStore.setState({ pending: [] });
  pendingVideoStorage.add({ videoId: 42, startedAtMs: Date.now() });
};

beforeEach(() => {
  localStorage.clear();
  // C9 게이트(develop 머지): [다시 업로드]의 위저드 열림은 로그인 상태가 전제 (B17 단정 불변)
  useUploadModalStore.setState({ open: false, pendingAfterLogin: false });
  useAuthStore.setState({ accessToken: "token", isAuthenticated: true });
  seedPending();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("블러 처리 통지 (B16·B17)", () => {
  it("READY 전이 시 완료 토스트가 뜨고 대기 목록에서 제거된다 (B15·B16)", async () => {
    stubPlayback("READY", "https://cdn.example.com/blur.mp4");
    renderNotices();

    expect(await screen.findByText("AI 블러 처리 완료")).toBeTruthy();
    expect(screen.getByText("눌러서 결과를 확인하세요")).toBeTruthy();
    expect(pendingVideoStorage.list()).toEqual([]);
  });

  it("[확인하기]로 블러 확인 모달이 열려 playbackUrl(블러본)로 재생되고, [확인]은 닫기만 한다 (B16)", async () => {
    stubPlayback("READY", "https://cdn.example.com/blur.mp4");
    renderNotices();
    await screen.findByText("AI 블러 처리 완료");

    fireEvent.click(screen.getByRole("button", { name: "확인하기" }));

    expect(
      screen.getAllByRole("dialog", { name: "AI 자동 블러 확인" }).length,
    ).toBeGreaterThan(0);
    const video = document.querySelector("video");
    expect(video?.getAttribute("src")).toBe("https://cdn.example.com/blur.mp4");

    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    await waitFor(() =>
      expect(
        screen.queryAllByRole("dialog", { name: "AI 자동 블러 확인" }),
      ).toEqual([]),
    );
    // 닫기만 한다 — 업로드 플로우가 열리지 않는다
    expect(useUploadModalStore.getState().open).toBe(false);
  });

  it("READY 전이 시 해당 격자 쿼리를 재무효화한다 — 블러 완료 후 상세의 대표 영상이 새로고침 없이 갱신", async () => {
    stubPlayback("READY", "https://cdn.example.com/blur.mp4");
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    renderNotices(client);
    await screen.findByText("AI 블러 처리 완료");

    const calledKeys = invalidate.mock.calls.map((call) =>
      JSON.stringify(call[0]?.queryKey),
    );
    // 격자 커버(대표 영상) 키가 응답 gridId로 무효화됐는지 — 나머지 상세 키도 동일 경로
    expect(calledKeys.some((key) => key?.includes('"grid-77"'))).toBe(true);
  });

  it("FAILED 전이 시 실패 토스트 + [다시 업로드]가 새 업로드 플로우를 연다 (B17)", async () => {
    stubPlayback("FAILED", null);
    renderNotices();

    expect(await screen.findByText("블러 처리에 실패했어요")).toBeTruthy();
    expect(pendingVideoStorage.list()).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "다시 업로드" }));

    expect(useUploadModalStore.getState().open).toBe(true);
    // 토스트는 행동 후 닫힌다
    expect(screen.queryByText("블러 처리에 실패했어요")).toBeNull();
  });

  it("처리 중(BLURRING)이면 통지가 뜨지 않고 대기 목록이 유지된다 — 전이는 폴링이 감지 (B14)", async () => {
    stubPlayback("BLURRING", null);
    renderNotices();

    // 즉시 조회가 pending 판정으로 끝날 때까지 대기
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("AI 블러 처리 완료")).toBeNull();
    expect(pendingVideoStorage.list().map((p) => p.videoId)).toEqual([42]);
  });
});
