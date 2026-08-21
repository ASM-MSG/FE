import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewStep } from "./PreviewStep";

/**
 * 미리보기 스텝 버튼 게이팅 스모크 (리뷰 반영) — 트리밍 진행 중 [이전 단계로]를 막는다.
 * 트리밍 중 하이라이트로 되돌아가 다른 구간을 고르면 싱글턴 ffmpeg 인스턴스·고정
 * 파일명을 두 트리밍이 공유해 last-write-wins 경쟁이 생긴다 (✕ 닫기의 busy 게이팅과 동일 패턴).
 */
const renderStep = (trimStatus: "trimming" | "ready") =>
  render(
    <PreviewStep
      trim={
        trimStatus === "trimming"
          ? { status: "trimming" }
          : {
              status: "ready",
              blob: new Blob(["v"], { type: "video/mp4" }),
              durationSec: 5,
              objectUrl: null,
            }
      }
      segment={{ start: 3, end: 8 }}
      locationLabel="부산 부산진구 부전동"
      confirmLabel="업로드하기"
      submittingLabel="업로드 중…"
      onRetryTrim={() => {}}
      onPublish={() => {}}
      submitting={false}
      submitFailureMessage={null}
      onBack={vi.fn()}
      onClose={() => {}}
    />,
  );

afterEach(() => {
  cleanup();
});

describe("PreviewStep — [이전 단계로] 게이팅", () => {
  it("트리밍 진행 중에는 비활성이다 — ffmpeg 경쟁 차단", () => {
    renderStep("trimming");
    expect(
      (
        screen.getByRole("button", {
          name: "이전 단계로",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("트리밍 완료 후에는 활성이다", () => {
    renderStep("ready");
    expect(
      (
        screen.getByRole("button", {
          name: "이전 단계로",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
