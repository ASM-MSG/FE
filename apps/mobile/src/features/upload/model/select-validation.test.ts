import { describe, expect, it } from "vitest";
import {
  resolveSelectionRejection,
  SELECTION_REJECTION_MESSAGES,
} from "./select-validation";
import type { UploadVideo } from "./upload-flow-store";

/**
 * 선택 화면 사전 검증 (구현 계획 Phase 3 — "picker 결과에 파일 메타 캡처 + 검증 신설").
 * 서버 3426·3425·3413을 부르기 전에 같은 기준(upload-validation)으로 FE가 먼저 거른다 —
 * 원본 전체를 올리는 D1 구조에서 500MB 압박을 사전 차단하는 1차 방어이기도 하다(R3).
 */
const video = (patch: Partial<UploadVideo> = {}): UploadVideo => ({
  uri: "file:///clip.mp4",
  durationSec: 42,
  fileName: "clip.mp4",
  fileSize: 12 * 1024 * 1024,
  mimeType: "video/mp4",
  ...patch,
});

describe("resolveSelectionRejection — 선택 직후 파일 사전 검증", () => {
  it("MP4·MOV·500MB 이하·180초 이하 영상은 거부하지 않는다", () => {
    expect(resolveSelectionRejection(video())).toBeNull();
    expect(
      resolveSelectionRejection(video({ fileName: "clip.MOV" })),
    ).toBeNull();
  });

  it("허용 확장자가 아니면 확장자 사유로 거부한다", () => {
    expect(resolveSelectionRejection(video({ fileName: "clip.avi" }))).toBe(
      SELECTION_REJECTION_MESSAGES.extension,
    );
  });

  it("500MB를 넘으면 용량 사유로 거부한다 — 원본 전체 업로드의 메모리 압박 차단 (R3)", () => {
    expect(
      resolveSelectionRejection(video({ fileSize: 500 * 1024 * 1024 + 1 })),
    ).toBe(SELECTION_REJECTION_MESSAGES.size);
  });

  it("180초를 넘으면 길이 사유로 거부한다 — 서버 3425의 FE 1차 검증 (D1 파생)", () => {
    expect(resolveSelectionRejection(video({ durationSec: 181 }))).toBe(
      SELECTION_REJECTION_MESSAGES.duration,
    );
  });

  it("길이·용량을 picker가 주지 않으면 확인 불가 사유로 거부한다 — presign contentLength를 만들 수 없다", () => {
    expect(resolveSelectionRejection(video({ durationSec: null }))).toBe(
      SELECTION_REJECTION_MESSAGES.unknown,
    );
    expect(resolveSelectionRejection(video({ fileSize: null }))).toBe(
      SELECTION_REJECTION_MESSAGES.unknown,
    );
  });
});
