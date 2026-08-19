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
  type UploadCandidate,
} from "./upload-validation";

/**
 * 파일 검증(확장자·용량·길이) 판정이 웹 MSG-329 원본과 동등하다 — 선택 화면의 사전 차단이
 * 서버 3426·3425·3413과 같은 기준을 쓴다는 계약 (기준 30·44, D1 파생 "최대 180초").
 * 웹 원본은 변수 경로 동적 import (upload-wizard.parity.test.ts의 주석 참조).
 */
interface WebUploadValidationModule {
  ALLOWED_VIDEO_EXTENSIONS: typeof ALLOWED_VIDEO_EXTENSIONS;
  MAX_UPLOAD_BYTES: number;
  MAX_DURATION_SEC: number;
  hasAllowedVideoExtension: typeof hasAllowedVideoExtension;
  isWithinSizeLimit: typeof isWithinSizeLimit;
  isWithinDurationLimit: typeof isWithinDurationLimit;
  isValidVideoFile: typeof isValidVideoFile;
  canSubmitUpload: typeof canSubmitUpload;
}
const WEB_UPLOAD_VALIDATION_PATH = new URL(
  "../../../../../web/src/features/upload/model/upload-validation.ts",
  import.meta.url,
).pathname;
const loadWebUploadValidation = (): Promise<WebUploadValidationModule> =>
  import(WEB_UPLOAD_VALIDATION_PATH);

const NAMES = [
  "clip.mp4",
  "CLIP.MP4",
  "clip.mov",
  "clip.MOV",
  "clip.avi",
  "clip",
  "",
  ".mp4",
];
const SIZES = [0, 1, MAX_UPLOAD_BYTES, MAX_UPLOAD_BYTES + 1];
const DURATIONS = [0, 1, 30, MAX_DURATION_SEC, MAX_DURATION_SEC + 1];

describe("upload-validation — 업로드 전 파일 검증 (D1 파생)", () => {
  it("MP4·MOV만 허용하고 대소문자를 가리지 않는다", () => {
    expect(hasAllowedVideoExtension("clip.MP4")).toBe(true);
    expect(hasAllowedVideoExtension("clip.mov")).toBe(true);
    expect(hasAllowedVideoExtension("clip.avi")).toBe(false);
    expect(hasAllowedVideoExtension("clip")).toBe(false);
  });

  it("500MB 이하만 허용한다 — 원본 전체 업로드의 메모리 압박 사전 차단 (R3)", () => {
    expect(isWithinSizeLimit(MAX_UPLOAD_BYTES)).toBe(true);
    expect(isWithinSizeLimit(MAX_UPLOAD_BYTES + 1)).toBe(false);
  });

  it("180초 이하만 허용한다 — 안내 문구 '최대 180초'와 같은 상수다 (D1 파생)", () => {
    expect(MAX_DURATION_SEC).toBe(180);
    expect(isWithinDurationLimit(180)).toBe(true);
    expect(isWithinDurationLimit(181)).toBe(false);
  });

  it("확장자·용량을 모두 만족해야 유효 파일이다", () => {
    const valid: UploadCandidate = { name: "clip.mp4", size: 1024 };
    expect(isValidVideoFile(valid)).toBe(true);
    expect(isValidVideoFile({ name: "clip.avi", size: 1024 })).toBe(false);
    expect(
      isValidVideoFile({ name: "clip.mp4", size: MAX_UPLOAD_BYTES + 1 }),
    ).toBe(false);
  });
});

describe("웹 원본 동등성 (기준 44)", () => {
  it("허용 확장자·용량 상한·길이 상한 상수가 웹과 같다", async () => {
    const web = await loadWebUploadValidation();

    expect([...ALLOWED_VIDEO_EXTENSIONS]).toEqual([
      ...web.ALLOWED_VIDEO_EXTENSIONS,
    ]);
    expect(MAX_UPLOAD_BYTES).toBe(web.MAX_UPLOAD_BYTES);
    expect(MAX_DURATION_SEC).toBe(web.MAX_DURATION_SEC);
  });

  it("파일명·용량·길이 전 조합에서 웹 판정과 동일하다", async () => {
    const web = await loadWebUploadValidation();

    for (const name of NAMES) {
      expect(hasAllowedVideoExtension(name)).toBe(
        web.hasAllowedVideoExtension(name),
      );
      for (const size of SIZES) {
        const candidate = { name, size };
        expect(isValidVideoFile(candidate)).toBe(
          web.isValidVideoFile(candidate),
        );
        expect(canSubmitUpload(candidate)).toBe(web.canSubmitUpload(candidate));
      }
    }
    for (const size of SIZES) {
      expect(isWithinSizeLimit(size)).toBe(web.isWithinSizeLimit(size));
    }
    for (const duration of DURATIONS) {
      expect(isWithinDurationLimit(duration)).toBe(
        web.isWithinDurationLimit(duration),
      );
    }
    expect(canSubmitUpload(null)).toBe(web.canSubmitUpload(null));
  });
});
