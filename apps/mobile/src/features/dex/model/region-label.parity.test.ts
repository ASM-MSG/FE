import { describe, expect, it } from "vitest";
import { formatProgressRate, shortRegionName } from "./region-label";

/**
 * L8·L9 parity: 모바일 `region-label` ↔ 웹 `features/dex/model/region-label.ts` 동등성
 * (티켓 포팅 슬롯 "current-region" — MSG-327이 구 use-current-region 역지오코딩을
 * 대체하며 신설한 표시 보정 모듈이 실제 원본이다).
 * 모바일 구현은 `.at(-1)` 대신 인덱스 접근을 쓴다(Hermes 안전 경로) — 이 테스트가
 * 결과 동등성을 고정한다. 웹 파일이 이동·삭제되면 깨진다(의도된 드리프트 감지).
 */
interface WebRegionLabelModule {
  shortRegionName: typeof shortRegionName;
  formatProgressRate: typeof formatProgressRate;
}

const WEB_REGION_LABEL_PATH = new URL(
  "../../../../../web/src/features/dex/model/region-label.ts",
  import.meta.url,
).pathname;

const loadWebRegionLabel = (): Promise<WebRegionLabelModule> =>
  import(WEB_REGION_LABEL_PATH);

describe("region-label 동등성 (L8·L9)", () => {
  it("shortRegionName 결과가 웹 원본과 동일하다 — 전체 경로/단일 토큰/빈 문자열/공백 다중 (L9)", async () => {
    const web = await loadWebRegionLabel();
    const samples = [
      "부산광역시 부산진구 부전2동",
      "부전2동",
      "",
      "부산광역시  부산진구  전포1동",
      "부산광역시 부산진구 ",
    ];

    for (const sample of samples) {
      expect(shortRegionName(sample)).toBe(web.shortRegionName(sample));
    }
  });

  it("formatProgressRate 결과가 웹 원본과 동일하다 — 0/소수/정수/100 (L8)", async () => {
    const web = await loadWebRegionLabel();

    for (const sample of [0, 6.85, 7, 52.04, 100]) {
      expect(formatProgressRate(sample)).toBe(web.formatProgressRate(sample));
    }
  });
});
