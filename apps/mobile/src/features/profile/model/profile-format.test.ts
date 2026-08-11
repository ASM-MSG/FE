import { describe, expect, it } from "vitest";
import { formatJoinedDate } from "./profile-format";

/**
 * AC 3: 가입일 포맷 함수 (구 parity에서 전환 — MSG-329).
 * 웹은 프로필 실 API 전환으로 가입일 표시가 사라져 profile-format 원본을 폐기했다
 * (명세 부재 — 조회 노출은 백엔드 환류). 모바일은 mock 화면이 아직 쓰므로 동작
 * 단정을 모바일 단독으로 유지한다.
 */
describe("formatJoinedDate (AC 3)", () => {
  it("'2026-01-12'를 '2026.01.12'로 변환한다 (AC 3)", () => {
    expect(formatJoinedDate("2026-01-12")).toBe("2026.01.12");
  });

  it("제로 패딩·시간부 제거·비정형 입력 폴백을 지킨다", () => {
    expect(formatJoinedDate("2026-1-2")).toBe("2026.01.02"); // 한 자리 월·일 → 제로 패딩
    expect(formatJoinedDate("2026-01-12T09:00:00+09:00")).toBe("2026.01.12"); // 시간부 제거
    expect(formatJoinedDate("2026/01/12")).toBe("2026/01/12"); // 3파트 아님 → 원본 그대로
    expect(formatJoinedDate("")).toBe("");
  });
});
