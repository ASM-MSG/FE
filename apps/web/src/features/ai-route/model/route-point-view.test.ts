import { describe, expect, it } from "vitest";
import { kindTag, partialBannerText, stopMetaLine } from "./route-point-view";

const META = {
  zoneName: "서면",
  zoneCell: "A-14",
  regionName: "부산 부산진구",
};

describe("stopMetaLine — 표시명 줄 조립 (L1)", () => {
  it("zoneName이 있으면 '{zoneName} {zoneCell}'과 regionName을 ' · '로 이어 붙인다 (L1)", () => {
    expect(stopMetaLine(META)).toBe("서면 A-14 · 부산 부산진구");
  });

  it("zoneName이 없으면 regionName만 남는다 (L1)", () => {
    expect(
      stopMetaLine({
        zoneName: null,
        zoneCell: null,
        regionName: "부산 부산진구",
      }),
    ).toBe("부산 부산진구");
  });

  it("regionName이 없으면 구역 조각만 남는다 (L1)", () => {
    expect(stopMetaLine({ ...META, regionName: null })).toBe("서면 A-14");
  });

  it("둘 다 null이면 null이다 — 줄 자체를 생략한다 (L1)", () => {
    expect(
      stopMetaLine({ zoneName: null, zoneCell: null, regionName: null }),
    ).toBeNull();
  });
});

describe("kindTag — 지점 종류 태그 매핑 (L2)", () => {
  it("서버 kind 5종을 사용자 언어 라벨로 바꾼다 (L2)", () => {
    expect(kindTag("PLACE")?.label).toBe("장소");
    expect(kindTag("EVENT")?.label).toBe("행사");
    expect(kindTag("MISSION_FESTIVAL")?.label).toBe("축제");
    expect(kindTag("MISSION_POPUP")?.label).toBe("팝업");
    expect(kindTag("MISSION_COURSE")?.label).toBe("코스");
  });

  it("행사와 축제는 같은 festival 톤을 쓴다 — 글자로만 구분한다 (승인 Q3)", () => {
    expect(kindTag("EVENT")?.tone).toBe("festival");
    expect(kindTag("MISSION_FESTIVAL")?.tone).toBe("festival");
  });

  it("서버가 준 미지 문자열이면 null이다 — 태그를 표시하지 않는다 (L2, R4)", () => {
    expect(kindTag("SOMETHING_NEW")).toBeNull();
    expect(kindTag("")).toBeNull();
  });
});

describe("partialBannerText — 결과 부족 배너 문구 (L4)", () => {
  it("notice가 null이면 배너 문구가 없다 (L4)", () => {
    expect(partialBannerText(null, 3)).toBeNull();
  });

  it("notice가 있으면 실제 개수를 넣은 FE 고정 문구를 만든다 — 서버 notice 문자열은 쓰지 않는다 (L4)", () => {
    const text = partialBannerText("서버가 준 안내 문구", 2);

    expect(text).toBe(
      "조건에 맞는 곳을 2곳만 찾았어요. 문장을 바꾸거나 다른 지역에서 다시 짜 보세요",
    );
    expect(text).not.toContain("서버가 준 안내 문구");
  });

  it("0곳이어도 같은 문구를 개수만 바꿔 만든다 (L4)", () => {
    expect(partialBannerText("부족", 0)).toContain("0곳만 찾았어요");
  });
});
