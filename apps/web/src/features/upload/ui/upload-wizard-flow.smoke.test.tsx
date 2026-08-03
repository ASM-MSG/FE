import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";

/**
 * 업로드 위저드 핵심 흐름 스모크. (MSG-163 — page-verification "뷰 스모크 승격" 정책)
 * MSG-117~120 검증마다 임시 RTL 하네스를 재작성·폐기하던 것을 커밋 자산으로 승격했다.
 *
 * 검증 범위: 스텝 전환·선택 결과 상위 전달·닫힘/재오픈 초기화 배선(wiring)만.
 * 문구·스타일 디테일은 단정하지 않는다 — 그건 티켓별 브라우저 검증의 몫이다.
 * 플랫폼 seam인 useVideoDuration만 목킹해 duration을 통제한다(MSG-119 검증 하네스와 동일 기법).
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

import { UploadModal } from "./UploadModal";

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

describe("업로드 위저드 흐름 스모크", () => {
  beforeEach(() => {
    useUploadModalStore.setState({ open: false });
    mockMeta.duration = null;
    mockMeta.objectUrl = null;
    mockMeta.error = false;
    render(<UploadModal />);
  });

  afterEach(() => {
    cleanup();
  });

  it("파일 선택 전에는 '다음'이 비활성이고, 유효 파일 + duration 확정 시 활성화된다", () => {
    mockMeta.duration = 3;
    openModal();

    expect(nextButton().disabled).toBe(true);
    selectValidFile();
    expect(nextButton().disabled).toBe(false);
  });

  it("5초 이하 영상: 하이라이트(2/4)를 건너뛰고 블러(3/4) 직행 → 게시 → 재오픈 시 1단계 초기화", () => {
    mockMeta.duration = 3;
    openModal();
    selectValidFile();
    fireEvent.click(nextButton());

    // 블러 확인(3/4)으로 직행 — 하이라이트 화면 미경유
    expect(screen.getByText("AI 자동 블러 확인")).toBeTruthy();
    expect(screen.queryByText("AI 하이라이트 추천")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "확인 후 다음 단계" }));

    // 미리보기(4/4) — 하이라이트 카드는 건너뜀 흐름이라 없음
    expect(screen.getByText("업로드 미리보기")).toBeTruthy();
    expect(screen.queryByText(/AI 하이라이트 구간/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "지금 게시하기" }));
    expect(useUploadModalStore.getState().open).toBe(false);
    expect(screen.queryByText("업로드 미리보기")).toBeNull();

    // 재오픈 — 1단계 초기 상태(이전 파일·스텝 미잔존)
    // "영상 업로드"는 sr-only Dialog.Title과 ModalCard 제목 두 곳에 있어 개수로 확인
    openModal();
    expect(screen.getAllByText("영상 업로드").length).toBeGreaterThan(0);
    expect(screen.queryByText("clip.mp4")).toBeNull();
    expect(nextButton().disabled).toBe(true);
  });

  it("5초 초과 영상: 하이라이트(2/4) 경유 → 구간 선택이 4/4 하이라이트 카드에 반영된다", () => {
    mockMeta.duration = 42;
    openModal();
    selectValidFile();
    fireEvent.click(nextButton());

    // 하이라이트(2/4) 진입
    expect(screen.getByText("AI 하이라이트 추천")).toBeTruthy();

    // 추천 구간 선택(첫 번째) 후 다음 단계로
    const suggestion = document.querySelector("[aria-pressed]");
    if (!suggestion) throw new Error("추천 구간 버튼이 렌더되지 않음");
    fireEvent.click(suggestion);
    fireEvent.click(
      screen.getByRole("button", { name: "이 구간으로 다음 단계" }),
    );

    // 블러(3/4) → 미리보기(4/4)
    expect(screen.getByText("AI 자동 블러 확인")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "확인 후 다음 단계" }));
    expect(screen.getByText("업로드 미리보기")).toBeTruthy();

    // 선택 결과가 상위로 전달되어 하이라이트 카드가 렌더됨 (MSG-120 S11 배선)
    expect(screen.getByText(/AI 하이라이트 구간/)).toBeTruthy();
  });

  it("중간 단계에서 ✕로 닫으면 재오픈 시 1단계 초기 상태다", () => {
    mockMeta.duration = 42;
    openModal();
    selectValidFile();
    fireEvent.click(nextButton());
    expect(screen.getByText("AI 하이라이트 추천")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(useUploadModalStore.getState().open).toBe(false);

    openModal();
    expect(screen.getAllByText("영상 업로드").length).toBeGreaterThan(0);
    expect(screen.queryByText("AI 하이라이트 추천")).toBeNull();
    expect(screen.queryByText("clip.mp4")).toBeNull();
  });
});
