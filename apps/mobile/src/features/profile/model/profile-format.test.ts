import { describe, expect, it } from "vitest";
import { formatJoinedDate } from "./profile-format";

/**
 * 템플릿 ① 순수 로직 — 가입일 표기 (기준 13의 표시 계약).
 * [MSG-426] 구 모바일 구현은 시간부를 잘라내기만 해 서버 `createdAt`(타임존 마커 없는 UTC)의
 * KST 00~09시 가입자 가입일이 하루 전으로 밀렸다 — 웹 KST 보정판으로 교체하고 parity로 고정한다.
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

/** 날짜만·마커 있는 시각·마커 없는 시각·비정형까지 — 두 구현이 갈릴 수 있는 형태 전부 */
const samples = [
  "2026-01-12",
  "2026-1-2",
  "2026-01-12T09:00:00+09:00",
  "2026-01-12T00:30:00",
  "2026-01-12T15:30:00",
  "2026-01-12T23:59:59Z",
  "2026/01/12",
  "",
];

describe("formatJoinedDate — 가입일 YYYY.MM.DD 표기 (기준 13)", () => {
  it("날짜만 오면 그 표기를 그대로 쓰고 한 자리 월·일은 제로 패딩한다", () => {
    expect(formatJoinedDate("2026-01-12")).toBe("2026.01.12");
    expect(formatJoinedDate("2026-1-2")).toBe("2026.01.02");
  });

  it("타임존 마커 없는 UTC 시각은 KST(+9)로 옮긴 날짜를 표기한다 — UTC 15시 이후는 다음 날 (MSG-426 부족분 포팅)", () => {
    expect(formatJoinedDate("2026-01-12T15:30:00")).toBe("2026.01.13");
    expect(formatJoinedDate("2026-01-12T14:59:59")).toBe("2026.01.12");
  });

  it("KST 자정 직후 가입자의 가입일이 하루 전으로 밀리지 않는다 — 구 구현이 틀렸던 지점", () => {
    // KST 2026-01-12 00:30 = UTC 2026-01-11 15:30
    expect(formatJoinedDate("2026-01-11T15:30:00")).toBe("2026.01.12");
  });

  it("연-월-일 3파트가 아니면 원본을 그대로 돌려준다 — 형식 편차 방어", () => {
    expect(formatJoinedDate("2026/01/12")).toBe("2026/01/12");
    expect(formatJoinedDate("")).toBe("");
  });

  it("웹 원본 formatJoinedDate와 모든 표본에서 동등하다 (parity)", async () => {
    const web = await loadWebProfileFormat();

    for (const iso of samples) {
      expect(formatJoinedDate(iso)).toBe(web.formatJoinedDate(iso));
    }
  });
});
