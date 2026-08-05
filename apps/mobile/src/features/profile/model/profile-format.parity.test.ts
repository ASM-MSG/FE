import { describe, expect, it } from "vitest";
import { formatJoinedDate } from "./profile-format";

/**
 * AC 3: 가입일 포맷 함수가 "2026-01-12" → "2026.01.12"를 반환하고
 * 웹 formatJoinedDate와 동등하다 (parity — format.parity 선례).
 */
interface WebProfileFormatModule {
  formatJoinedDate: typeof formatJoinedDate;
}
const WEB_PROFILE_FORMAT_PATH = new URL(
  "../../../../../web/src/features/profile/model/profile-format.ts",
  import.meta.url,
).pathname;
const loadWebProfileFormat = (): Promise<WebProfileFormatModule> =>
  import(WEB_PROFILE_FORMAT_PATH);

describe("formatJoinedDate 동등성 (AC 3)", () => {
  it("'2026-01-12'를 '2026.01.12'로 변환한다 (AC 3)", () => {
    expect(formatJoinedDate("2026-01-12")).toBe("2026.01.12");
  });

  it("제로 패딩·비정형 입력 폴백까지 웹 원본과 결과가 동일하다 (AC 3 parity)", async () => {
    const web = await loadWebProfileFormat();
    const samples = [
      "2026-01-12",
      "2026-1-2", // 한 자리 월·일 → 제로 패딩
      "2026-01-12T09:00:00+09:00", // 시간부 제거
      "2026/01/12", // 3파트 아님 → 원본 그대로
      "",
    ];
    for (const iso of samples) {
      expect(formatJoinedDate(iso)).toBe(web.formatJoinedDate(iso));
    }
  });
});
