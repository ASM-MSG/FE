import { describe, expect, it } from "vitest";
import {
  MAP_FOCUS_PARAM,
  buildMapFocusPath,
  parseMapFocusParam,
} from "./map-focus-link";

describe("buildMapFocusPath — 유저 지도 focus 딥링크 조립 (AC 6)", () => {
  it("좌표를 '/?focus=lat,lng' 경로로 만든다 (AC 6)", () => {
    expect(buildMapFocusPath({ lat: 35.157912, lng: 129.059412 })).toBe(
      "/?focus=35.157912,129.059412",
    );
  });

  it("조립한 경로는 다시 같은 좌표로 해석된다 (왕복)", () => {
    const path = buildMapFocusPath({ lat: 35.1579, lng: 129.0594 });

    const raw = new URL(path, "https://fillmap.kr").searchParams.get(
      MAP_FOCUS_PARAM,
    );

    expect(parseMapFocusParam(raw)).toEqual({ lat: 35.1579, lng: 129.0594 });
  });
});

describe("parseMapFocusParam — focus 파라미터 해석 (AC 6)", () => {
  it("'lat,lng' 문자열을 좌표로 해석한다 (AC 6)", () => {
    expect(parseMapFocusParam("35.1579,129.0594")).toEqual({
      lat: 35.1579,
      lng: 129.0594,
    });
  });

  it("파라미터가 없으면 null이다 — 기존 진입과 동일하게 동작한다 (AC 6)", () => {
    expect(parseMapFocusParam(null)).toBeNull();
    expect(parseMapFocusParam("")).toBeNull();
  });

  it("숫자가 아니거나 토큰 수가 다르면 null이다 (경계)", () => {
    expect(parseMapFocusParam("서면")).toBeNull();
    expect(parseMapFocusParam("35.1579")).toBeNull();
    expect(parseMapFocusParam("35.1579,129.0594,16")).toBeNull();
    expect(parseMapFocusParam("35.1579,")).toBeNull();
  });

  it("위경도 범위를 벗어나면 null이다 (경계)", () => {
    expect(parseMapFocusParam("91,129.0594")).toBeNull();
    expect(parseMapFocusParam("35.1579,181")).toBeNull();
  });
});
