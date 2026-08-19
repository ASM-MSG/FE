import { describe, expect, it } from "vitest";
import {
  buildConfirmInput,
  canPublishUpload,
  CONFIRM_DURATION_MAX_SEC,
} from "./confirm-input";
import type { UploadVideo } from "./upload-flow-store";

/**
 * 기준 25·26: 확정 body의 `durationSec`이 **선택 구간 길이**(원본 길이가 아니다)이고,
 * 반올림 후 서버 계약 1~30을 항상 만족한다(D1). 좌표는 호출부가 넘긴
 * `resolveMapCenter()` 결과 그대로다(D8 — 권한 거부·실패 시 서면 폴백은 어댑터 계약).
 */
const video: UploadVideo = {
  uri: "file:///clip.mp4",
  // 원본 180초 — 확정 durationSec으로 새어 나가면 안 되는 값
  durationSec: 180,
  fileName: "clip.mp4",
  fileSize: 12 * 1024 * 1024,
  mimeType: "video/mp4",
};
const center = { lat: 35.1579, lng: 129.0594 };

describe("buildConfirmInput — 업로드 확정 입력 조립 (기준 25·26)", () => {
  it("durationSec이 원본 길이가 아니라 선택 구간 길이다 (기준 25, D1)", () => {
    const input = buildConfirmInput(video, { start: 3, end: 8 }, center);

    expect(input.durationSec).toBe(5);
  });

  it("소수 구간은 반올림한 초로 보낸다 (기준 25)", () => {
    expect(
      buildConfirmInput(video, { start: 3.2, end: 8.9 }, center).durationSec,
    ).toBe(6);
  });

  it("반올림 후에도 서버 계약 1~30을 항상 만족한다 (기준 25 — 경계)", () => {
    expect(
      buildConfirmInput(video, { start: 0, end: 0.2 }, center).durationSec,
    ).toBe(1);
    expect(
      buildConfirmInput(video, { start: 0, end: 120 }, center).durationSec,
    ).toBe(CONFIRM_DURATION_MAX_SEC);
  });

  it("lat·lng가 넘겨받은 좌표 그대로다 — resolveMapCenter() 결과 (기준 26, D8)", () => {
    const input = buildConfirmInput(video, { start: 3, end: 8 }, center);

    expect(input.lat).toBe(center.lat);
    expect(input.lng).toBe(center.lng);
  });

  it("presign 입력(파일명·크기·MIME)은 선택한 원본 파일 메타를 그대로 싣는다 — 트리밍 없이 원본을 올린다 (D1)", () => {
    const input = buildConfirmInput(video, { start: 3, end: 8 }, center);

    expect(input.uri).toBe(video.uri);
    expect(input.fileName).toBe("clip.mp4");
    expect(input.fileSize).toBe(video.fileSize);
    expect(input.contentType).toBe("video/mp4");
  });

  it("picker가 MIME을 주지 않으면 video/mp4로 폴백한다 — presign 서명 타입과 PUT 헤더가 어긋나지 않게", () => {
    const input = buildConfirmInput(
      { ...video, mimeType: null },
      { start: 3, end: 8 },
      center,
    );

    expect(input.contentType).toBe("video/mp4");
  });
});

/**
 * codex 리뷰 P2: `resolveMapCenter()`가 진행 중이면 `center`가 null인데 `[업로드하기]`는
 * 활성이었다. 누르면 발사 함수가 조용히 반환해 **주 동작이 고장난 것처럼 보인다**.
 * 발사 가능 여부를 순수 판정으로 내려 버튼 비활성 조건과 발사 가드가 같은 규칙을 쓰게 한다.
 */
describe("canPublishUpload — [업로드하기] 발사 가능 판정 (기준 19·26)", () => {
  const ready = {
    video,
    segment: { start: 3, end: 8 },
    center,
    submitting: false,
  };

  it("영상·구간·좌표가 모두 준비되면 발사할 수 있다 (기준 19)", () => {
    expect(canPublishUpload(ready)).toBe(true);
  });

  it("좌표 확보 전에는 발사할 수 없다 — 눌러도 아무 일이 없는 버튼을 만들지 않는다 (기준 26)", () => {
    expect(canPublishUpload({ ...ready, center: null })).toBe(false);
  });

  it("선택 구간이 없으면 발사할 수 없다 (기준 19)", () => {
    expect(canPublishUpload({ ...ready, segment: null })).toBe(false);
  });

  it("선택 영상이 없으면 발사할 수 없다 (기준 19)", () => {
    expect(canPublishUpload({ ...ready, video: null })).toBe(false);
  });

  it("확정이 진행 중이면 발사할 수 없다 (기준 35)", () => {
    expect(canPublishUpload({ ...ready, submitting: true })).toBe(false);
  });
});
