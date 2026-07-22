import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupRegionName } from "./region-lookup";

type RegionCodeCallback = (
  result: {
    region_type: string;
    region_2depth_name: string;
  }[],
  status: string,
) => void;

/** kakao services 전역 대역 — coord2RegionCode 구현만 주입한다 */
const stubKakao = (
  coord2RegionCode: (x: number, y: number, callback: RegionCodeCallback) => void,
) => {
  vi.stubGlobal("kakao", {
    maps: {
      services: {
        Status: { OK: "OK", ERROR: "ERROR", ZERO_RESULT: "ZERO_RESULT" },
        Geocoder: class {
          coord2RegionCode = coord2RegionCode;
        },
      },
    },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupRegionName — kakao 역지오코딩 어댑터 (AC 21·R7, 개정 D2)", () => {
  it("kakao SDK 전역이 없으면 크래시 없이 null을 반환한다 (R7 — 키 미설정·로드 전)", async () => {
    // jsdom 기본 환경 — kakao 전역 부재
    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBeNull();
  });

  it("services 라이브러리가 없으면(services 미포함 로드) null을 반환한다", async () => {
    vi.stubGlobal("kakao", { maps: {} });

    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBeNull();
  });

  it("조회 성공 시 행정동(H) 결과의 구 이름(region_2depth_name)을 반환한다", async () => {
    stubKakao((x, y, callback) => {
      expect(x).toBe(126.978); // 카카오 API는 x=경도, y=위도
      expect(y).toBe(37.5665);
      callback(
        [
          { region_type: "B", region_2depth_name: "중구(법정동)" },
          { region_type: "H", region_2depth_name: "중구" },
        ],
        "OK",
      );
    });

    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBe("중구");
  });

  it("행정동(H) 결과가 없으면 첫 결과의 구 이름으로 폴백한다", async () => {
    stubKakao((_x, _y, callback) => {
      callback([{ region_type: "B", region_2depth_name: "마포구" }], "OK");
    });

    await expect(
      lookupRegionName({ lat: 37.55, lng: 126.92 }),
    ).resolves.toBe("마포구");
  });

  it("조회 실패(status !== OK)·빈 결과면 null을 반환한다", async () => {
    stubKakao((_x, _y, callback) => callback([], "ERROR"));
    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBeNull();

    stubKakao((_x, _y, callback) => callback([], "OK"));
    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBeNull();
  });

  it("비동기 콜백이 OK인데 비정상 result(배열 아님)를 전달해도 크래시 없이 null을 반환한다 (R7)", async () => {
    stubKakao((_x, _y, callback) => {
      // 실제 SDK처럼 비동기 호출 — 콜백 본문은 등록부 try/catch 밖(SDK 스택)에서 실행된다
      queueMicrotask(() =>
        callback(null as unknown as Parameters<RegionCodeCallback>[0], "OK"),
      );
    });

    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBeNull();
  });

  it("Geocoder 호출이 예외를 던져도 크래시 없이 null을 반환한다 (R7)", async () => {
    stubKakao(() => {
      throw new Error("SDK not ready");
    });

    await expect(
      lookupRegionName({ lat: 37.5665, lng: 126.978 }),
    ).resolves.toBeNull();
  });
});
