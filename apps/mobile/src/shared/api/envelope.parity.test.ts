import { describe, expect, it } from "vitest";
import { unwrapEnvelope } from "./envelope";

/**
 * AC 4: 봉투 언랩이 웹과 동일하다 — 모바일 복제본과 웹 원본의 동등성을 고정한다
 * (수기 모듈은 복제 + parity, 스펙 추정 3 / format.parity.test.ts 선례).
 * 웹 파일이 이동·변경되면 이 테스트가 깨진다 — 의도된 드리프트 감지.
 */
const webPath = (rel: string) =>
  new URL(`../../../../web/src/${rel}`, import.meta.url).pathname;

const loadWebEnvelope = (): Promise<{
  unwrapEnvelope: typeof unwrapEnvelope;
}> => import(webPath("shared/api/envelope.ts"));

describe("envelope 동등성 (AC 4)", () => {
  it("unwrapEnvelope가 웹 원본과 동일하게 data 페이로드만 반환한다", async () => {
    const web = await loadWebEnvelope();
    const samples: Array<{
      developCode: number;
      message: string;
      data: unknown;
    }> = [
      { developCode: 0, message: "ok", data: { nickname: "필맵" } },
      { developCode: 0, message: "ok", data: [1, 2, 3] },
      { developCode: 0, message: "ok", data: null },
    ];
    for (const envelope of samples) {
      expect(unwrapEnvelope(envelope)).toEqual(web.unwrapEnvelope(envelope));
    }
  });
});
