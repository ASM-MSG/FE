import { beforeEach, describe, expect, it } from "vitest";
import { useLoginModalStore } from "./login-modal-store";

/**
 * 로그인 모달 열림 상태 로직 (MSG-46 후속 2 G6, test-first).
 * 업로드 모달 스토어 관례를 따르는 전역 UI 플래그 — 라우터 무참조(RN 경계).
 */
describe("로그인 모달 스토어 (G6)", () => {
  beforeEach(() => {
    useLoginModalStore.setState({ open: false });
  });

  it("초기값은 닫힘(false)이다", () => {
    expect(useLoginModalStore.getState().open).toBe(false);
  });

  it("openModal() 호출 시 열림(true)으로 바뀐다", () => {
    useLoginModalStore.getState().openModal();

    expect(useLoginModalStore.getState().open).toBe(true);
  });

  it("closeModal() 호출 시 닫힘(false)으로 돌아간다", () => {
    useLoginModalStore.getState().openModal();
    useLoginModalStore.getState().closeModal();

    expect(useLoginModalStore.getState().open).toBe(false);
  });
});
