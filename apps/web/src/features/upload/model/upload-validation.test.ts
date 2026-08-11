import { describe, expect, it } from "vitest";
import {
  ALLOWED_VIDEO_EXTENSIONS,
  canSubmitUpload,
  hasAllowedVideoExtension,
  isValidVideoFile,
  isWithinDurationLimit,
  isWithinSizeLimit,
  MAX_DURATION_SEC,
  MAX_UPLOAD_BYTES,
} from "./upload-validation";

describe("hasAllowedVideoExtension", () => {
  // AC14: MP4·MOV 확장자만 유효로 판정한다 (대소문자 무관)
  it("mp4 / mov 확장자는 대소문자와 무관하게 유효로 판정한다", () => {
    expect(hasAllowedVideoExtension("clip.mp4")).toBe(true);
    expect(hasAllowedVideoExtension("clip.MP4")).toBe(true);
    expect(hasAllowedVideoExtension("clip.mov")).toBe(true);
    expect(hasAllowedVideoExtension("clip.MOV")).toBe(true);
  });

  it("확장자가 여러 점 뒤에 있어도 마지막 확장자로 판정한다", () => {
    expect(hasAllowedVideoExtension("2026.07.20.mp4")).toBe(true);
  });

  // AC14: 그 외 확장자는 무효로 판정한다
  it("허용 목록에 없는 확장자는 무효로 판정한다", () => {
    expect(hasAllowedVideoExtension("photo.png")).toBe(false);
    expect(hasAllowedVideoExtension("video.avi")).toBe(false);
    expect(hasAllowedVideoExtension("doc.pdf")).toBe(false);
  });

  it("확장자가 없는 파일명은 무효로 판정한다", () => {
    expect(hasAllowedVideoExtension("mp4")).toBe(false);
    expect(hasAllowedVideoExtension("clip.")).toBe(false);
    expect(hasAllowedVideoExtension("")).toBe(false);
  });
});

describe("isWithinSizeLimit", () => {
  // AC14: 500MB 이하만 유효로 판정한다
  it("정확히 500MB는 유효로 판정한다", () => {
    expect(isWithinSizeLimit(MAX_UPLOAD_BYTES)).toBe(true);
  });

  it("500MB 미만은 유효로 판정한다", () => {
    expect(isWithinSizeLimit(1)).toBe(true);
    expect(isWithinSizeLimit(MAX_UPLOAD_BYTES - 1)).toBe(true);
  });

  // AC14: 500MB 초과는 무효로 판정한다
  it("500MB를 초과하면 무효로 판정한다", () => {
    expect(isWithinSizeLimit(MAX_UPLOAD_BYTES + 1)).toBe(false);
  });
});

describe("isValidVideoFile", () => {
  // AC14: 확장자·용량을 모두 만족해야 유효
  it("MP4·MOV이면서 500MB 이하인 파일만 유효로 판정한다", () => {
    expect(isValidVideoFile({ name: "a.mp4", size: 1000 })).toBe(true);
    expect(isValidVideoFile({ name: "a.mov", size: MAX_UPLOAD_BYTES })).toBe(
      true,
    );
  });

  it("확장자는 맞아도 용량이 초과하면 무효로 판정한다", () => {
    expect(
      isValidVideoFile({ name: "a.mp4", size: MAX_UPLOAD_BYTES + 1 }),
    ).toBe(false);
  });

  it("용량은 맞아도 확장자가 아니면 무효로 판정한다", () => {
    expect(isValidVideoFile({ name: "a.png", size: 1000 })).toBe(false);
  });
});

describe("canSubmitUpload", () => {
  // AC15 (Q5): 유효 파일이 선택되면 업로드 버튼을 활성으로 판정한다
  it("유효한 파일이 선택되면 true를 반환한다", () => {
    expect(canSubmitUpload({ name: "a.mp4", size: 1000 })).toBe(true);
  });

  // AC15 (Q5): 파일 미선택(null)이면 비활성으로 판정한다
  it("파일이 선택되지 않았으면(null) false를 반환한다", () => {
    expect(canSubmitUpload(null)).toBe(false);
  });

  // AC15: 선택되었어도 무효 파일이면 비활성으로 판정한다
  it("선택된 파일이 무효(확장자·용량 위반)면 false를 반환한다", () => {
    expect(canSubmitUpload({ name: "a.avi", size: 1000 })).toBe(false);
    expect(canSubmitUpload({ name: "a.mp4", size: MAX_UPLOAD_BYTES + 1 })).toBe(
      false,
    );
  });
});

// MSG-329 B1 신설 — 구현은 길이 검증이 없었다(구 "최대 60초"는 안내 텍스트뿐).
// use-video-duration 실측값을 받아 180초 이하를 판정한다.
describe("isWithinDurationLimit — 180초 이하 판정 (MSG-329 B1)", () => {
  it("정확히 180초는 유효로 판정한다", () => {
    expect(isWithinDurationLimit(MAX_DURATION_SEC)).toBe(true);
  });

  it("180초 미만은 유효로 판정한다", () => {
    expect(isWithinDurationLimit(1)).toBe(true);
    expect(isWithinDurationLimit(179.9)).toBe(true);
  });

  it("180초를 초과하면 무효로 판정한다 — 서버 3425 방어의 FE 1차 검증", () => {
    expect(isWithinDurationLimit(180.1)).toBe(false);
    expect(isWithinDurationLimit(600)).toBe(false);
  });
});

describe("상수", () => {
  it("허용 확장자는 mp4·mov이고 최대 용량은 500MB다", () => {
    expect(ALLOWED_VIDEO_EXTENSIONS).toEqual(["mp4", "mov"]);
    expect(MAX_UPLOAD_BYTES).toBe(500 * 1024 * 1024);
  });

  it("최대 길이는 180초다 (MSG-329 B1 — 구 60초 안내 폐기)", () => {
    expect(MAX_DURATION_SEC).toBe(180);
  });
});
