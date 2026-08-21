import { afterEach, describe, expect, it, vi } from "vitest";
import { formatUploadLocationLabel } from "./location-label";

/**
 * 기준 20: 업로드 위치 라벨이 하드코딩 mock이 아니라 역지오코딩 `regionName` 파생이고,
 * 응답이 없으면 "현재 위치"로 폴백한다 — 웹 MSG-329 원본과 동등.
 * 웹 원본(`use-upload-location.ts`)은 훅과 순수 함수가 한 파일에 있어 변수 경로 동적
 * import로 로드한다 (upload-wizard.parity.test.ts 주석 — 정적 import는 typecheck를 깬다).
 */
interface WebUploadLocationModule {
  formatUploadLocationLabel: (
    region: { regionName?: string } | null | undefined,
  ) => string;
}
const WEB_UPLOAD_LOCATION_PATH = new URL(
  "../../../../../web/src/features/upload/model/use-upload-location.ts",
  import.meta.url,
).pathname;
/**
 * 웹 원본은 훅과 함께 있어 생성 쿼리 옵션 → client-config(=EXPO_PUBLIC_API_BASE_URL 가드)를
 * 정적으로 끌고 온다 — 로드만 통과시키기 위해 env를 세운다(요청은 나가지 않는다).
 */
const loadWebUploadLocation = (): Promise<WebUploadLocationModule> => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
  return import(WEB_UPLOAD_LOCATION_PATH);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

const REGION_FIXTURES: ({ regionName?: string } | null | undefined)[] = [
  { regionName: "부산진구 부전동" },
  { regionName: "" },
  {},
  null,
  undefined,
];

describe("formatUploadLocationLabel — 위치 카드 문구 파생 (기준 20)", () => {
  it("역지오코딩 응답이 있으면 regionName을 그대로 쓴다 (기준 20)", () => {
    expect(formatUploadLocationLabel({ regionName: "부산진구 부전동" })).toBe(
      "부산진구 부전동",
    );
  });

  it("응답 없음(무귀속 좌표·조회 전)이면 '현재 위치'로 폴백한다 (기준 20)", () => {
    expect(formatUploadLocationLabel(null)).toBe("현재 위치");
    expect(formatUploadLocationLabel(undefined)).toBe("현재 위치");
  });
});

describe("웹 원본 동등성 (기준 44)", () => {
  it("응답 픽스처 전 조합에서 웹 formatUploadLocationLabel과 결과가 같다 (기준 20)", async () => {
    const web = await loadWebUploadLocation();

    for (const region of REGION_FIXTURES) {
      expect(formatUploadLocationLabel(region)).toBe(
        web.formatUploadLocationLabel(region),
      );
    }
  });
});
