import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupRegionName } from "./region-lookup";

/** reverseGeocode 응답 결과 한 건 — name(admcode/legalcode) + region.area2(구) */
type ReverseGeocodeResult = {
  name: string;
  region: { area2: { name: string } };
};

type ReverseGeocodeCallback = (
  status: number,
  response: { v2: { results: ReverseGeocodeResult[] } },
) => void;

type ReverseGeocodeOptions = {
  coords: { lat: number; lng: number };
  orders?: string;
};

/** naver 전역 대역 — Service.reverseGeocode 구현만 주입한다 (geocoder 서브모듈 등가) */
const stubNaver = (
  reverseGeocode: (
    options: ReverseGeocodeOptions,
    callback: ReverseGeocodeCallback,
  ) => void,
) => {
  vi.stubGlobal("naver", {
    maps: {
      // 실 SDK처럼 (lat, lng) 순서 생성자 — 좌표 순서 단정에 쓴다
      LatLng: class {
        lat: number;
        lng: number;
        constructor(lat: number, lng: number) {
          this.lat = lat;
          this.lng = lng;
        }
      },
      Service: {
        Status: { OK: 200, ERROR: 500 },
        reverseGeocode,
      },
    },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupRegionName — naver 역지오코딩 어댑터 (AC 6·R7 계약 유지)", () => {
  it("naver SDK 전역이 없으면 크래시 없이 null을 반환한다 (키 미설정·로드 전)", async () => {
    // jsdom 기본 환경 — naver 전역 부재
    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBeNull();
  });

  it("geocoder 서브모듈이 없으면(Service 미포함 로드) null을 반환한다", async () => {
    vi.stubGlobal("naver", { maps: {} });

    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBeNull();
  });

  it("조회 성공 시 admcode(행정동) 결과의 구 이름(region.area2.name)을 반환한다 (A4)", async () => {
    stubNaver((options, callback) => {
      // naver LatLng는 (lat, lng) 순서 — 카카오 (x=lng, y=lat)와 반대라 순서를 단정한다
      expect(options.coords).toMatchObject({ lat: 35.1579, lng: 129.0594 });
      // 행정동 우선 요청 (A4: admcode 우선)
      expect(options.orders).toBe("admcode,legalcode");
      callback(200, {
        v2: {
          results: [
            { name: "legalcode", region: { area2: { name: "부산진구(법정동)" } } },
            { name: "admcode", region: { area2: { name: "부산진구" } } },
          ],
        },
      });
    });

    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBe("부산진구");
  });

  it("admcode 결과가 없으면 첫 결과의 구 이름으로 폴백한다 (A4)", async () => {
    stubNaver((_options, callback) => {
      callback(200, {
        v2: {
          results: [{ name: "legalcode", region: { area2: { name: "수영구" } } }],
        },
      });
    });

    await expect(lookupRegionName({ lat: 35.16, lng: 129.06 })).resolves.toBe(
      "수영구",
    );
  });

  it("조회 실패(status !== OK)·빈 결과면 null을 반환한다", async () => {
    stubNaver((_options, callback) => callback(500, { v2: { results: [] } }));
    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBeNull();

    stubNaver((_options, callback) => callback(200, { v2: { results: [] } }));
    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBeNull();
  });

  it("비동기 콜백이 OK인데 비정상 response(v2/results 없음)를 전달해도 크래시 없이 null을 반환한다 (R7 계약)", async () => {
    stubNaver((_options, callback) => {
      // 실제 SDK처럼 비동기 호출 — 콜백 본문은 등록부 try/catch 밖(SDK 스택)에서 실행된다
      queueMicrotask(() =>
        callback(200, null as unknown as Parameters<ReverseGeocodeCallback>[1]),
      );
    });

    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBeNull();
  });

  it("reverseGeocode 호출이 예외를 던져도 크래시 없이 null을 반환한다 (R7 계약)", async () => {
    stubNaver(() => {
      throw new Error("SDK not ready");
    });

    await expect(
      lookupRegionName({ lat: 35.1579, lng: 129.0594 }),
    ).resolves.toBeNull();
  });
});
