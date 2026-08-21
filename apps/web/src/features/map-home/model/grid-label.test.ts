import { describe, expect, it } from "vitest";
import { gridDisplayName } from "./grid-label";

describe("격자 표시명 파생 (MSG-325 기준 6)", () => {
  it("구역 안 격자는 '구역명 셀코드'다 — Figma 카드 라벨('서면 A-14') 체계", () => {
    expect(
      gridDisplayName({
        gridId: "39064_112221",
        zoneName: "서면",
        zoneCell: "A-14",
      }),
    ).toBe("서면 A-14");
  });

  it("구역 밖 격자(zone 쌍이 null)는 행정동명으로 폴백한다 — 서버는 조립하지 않고 클라이언트가 분기한다", () => {
    expect(
      gridDisplayName(
        { gridId: "39064_112221", zoneName: null, zoneCell: null },
        "부산광역시 부산진구 부전1동",
      ),
    ).toBe("부산광역시 부산진구 부전1동");
  });

  it("구역도 행정동도 없으면(무귀속·미판정) gridId를 그대로 쓴다", () => {
    expect(
      gridDisplayName(
        { gridId: "39064_112221", zoneName: null, zoneCell: null },
        null,
      ),
    ).toBe("39064_112221");
    expect(
      gridDisplayName({
        gridId: "39064_112221",
        zoneName: null,
        zoneCell: null,
      }),
    ).toBe("39064_112221");
  });

  it("구역명이 있으면 행정동명이 함께 와도 구역 라벨이 우선한다", () => {
    expect(
      gridDisplayName(
        { gridId: "39064_112221", zoneName: "서면", zoneCell: "A-14" },
        "부산광역시 부산진구 부전1동",
      ),
    ).toBe("서면 A-14");
  });
});
