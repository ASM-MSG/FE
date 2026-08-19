import { describe, expect, it } from "vitest";
import { isNewVideo, NEW_VIDEO_WINDOW_MS } from "./video-new";

const NOW = Date.parse("2026-08-19T12:00:00+09:00");

/**
 * L7: `isNewVideo(createdAt, now)`가 24시간 **미만**이면 true,
 * 정확히 24시간 경과면 false, 미래 시각(음수 경과)이면 true를 반환한다.
 * 명세에 isNew 필드가 없어 FE가 24시간 창으로 판정한다 (웹 MSG-327 기준 14 포팅).
 */
describe("isNewVideo — 갤러리 NEW 배지 판정 (L7)", () => {
  it("창은 24시간이다 (L7)", () => {
    expect(NEW_VIDEO_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("24시간 미만 경과면 NEW다 (L7)", () => {
    expect(isNewVideo("2026-08-19T11:00:00+09:00", NOW)).toBe(true);
    expect(isNewVideo("2026-08-18T12:00:00.001+09:00", NOW)).toBe(true);
  });

  it("정확히 24시간 경과면 NEW가 아니다 (L7 경계)", () => {
    expect(isNewVideo("2026-08-18T12:00:00+09:00", NOW)).toBe(false);
  });

  it("미래 시각(서버·클라이언트 시계 차)이면 NEW다 (L7)", () => {
    expect(isNewVideo("2026-08-19T13:00:00+09:00", NOW)).toBe(true);
  });
});
