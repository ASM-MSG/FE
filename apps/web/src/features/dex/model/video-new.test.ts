import { describe, expect, it } from "vitest";
import { isNewVideo } from "./video-new";

const NOW = new Date("2026-08-14T12:00:00Z").getTime();

describe("isNewVideo — 갤러리 NEW 배지 판정 (기준 14, 사용자 확정 24시간)", () => {
  it("24시간 이내에 수집한 영상이면 NEW다", () => {
    expect(isNewVideo("2026-08-14T02:00:00Z", NOW)).toBe(true);
  });

  it("24시간을 넘긴 영상은 NEW가 아니다", () => {
    expect(isNewVideo("2026-08-13T11:00:00Z", NOW)).toBe(false);
  });

  it("정확히 24시간 전은 NEW가 아니다 (경계)", () => {
    expect(isNewVideo("2026-08-13T12:00:00Z", NOW)).toBe(false);
  });

  it("서버·클라이언트 시계 차로 미래 시각이 와도 NEW다 (경계)", () => {
    expect(isNewVideo("2026-08-14T12:30:00Z", NOW)).toBe(true);
  });
});
