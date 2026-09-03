import { describe, expect, it } from "vitest";
import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import {
  refreshEventLocationSelection,
  toEventLocationSelection,
} from "./event-location";

const dto = (videoCount: number): EventLocationResponseDto =>
  ({
    locationId: 11,
    name: "포토존",
    type: "POPUP",
    operatingHours: "10:00–18:00",
    gridIds: ["a", "b"],
    videoCount,
  }) as EventLocationResponseDto;

describe("refreshEventLocationSelection — 스냅숏을 최신 DTO로 (codex P2)", () => {
  it("같은 locationId의 DTO가 있으면 그 값(videoCount 등)으로 갱신한다", () => {
    const selected = toEventLocationSelection(dto(1));
    expect(refreshEventLocationSelection(selected, [dto(2)])).toEqual(
      toEventLocationSelection(dto(2)),
    );
  });

  it("목록에 없으면(재조회 전·빈 목록) 스냅숏을 그대로 유지한다", () => {
    const selected = toEventLocationSelection(dto(1));
    expect(refreshEventLocationSelection(selected, [])).toBe(selected);
  });
});
