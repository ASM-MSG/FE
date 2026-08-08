import { describe, expect, it } from "vitest";
import type { ApiResponseDtoGridCellResponseDto } from "./generated";
import { unwrapEnvelope } from "./envelope";

// 수용 기준 6: {developCode, message, data} 봉투를 받아 data를 반환한다 (queryOptions select 조합용)
describe("unwrapEnvelope", () => {
  it("성공 봉투에서 data 페이로드를 그대로 반환한다", () => {
    const data = { gridId: "123_456", occupied: true, videoCount: 3 };
    const envelope = { developCode: 1000, message: "성공", data };

    expect(unwrapEnvelope(envelope)).toBe(data);
  });

  it("생성된 ApiResponseDto 봉투 타입을 구조적 타이핑으로 수용한다", () => {
    const envelope: ApiResponseDtoGridCellResponseDto = {
      developCode: 1000,
      message: "성공",
      // zoneName·zoneCell은 required + nullable — 구역 밖 격자면 쌍으로 null
      data: {
        gridId: "9_9",
        occupied: false,
        videoCount: 0,
        zoneName: null,
        zoneCell: null,
      },
    };

    expect(unwrapEnvelope(envelope)).toEqual({
      gridId: "9_9",
      occupied: false,
      videoCount: 0,
      zoneName: null,
      zoneCell: null,
    });
  });

  it("봉투 없는 응답(예: logout의 200: unknown)은 언랩 비대상 — 타입 수준에서 거부된다", () => {
    const notEnvelope: unknown = "OK";

    // @ts-expect-error 봉투 3필드({developCode, message, data})가 아닌 값은 전달할 수 없다
    const result: unknown = unwrapEnvelope(notEnvelope);

    // 런타임 단정은 부수적 — 핵심은 위 타입 거부(시그니처가 느슨해지면 typecheck가 실패한다)
    expect(result).toBeUndefined();
  });
});
