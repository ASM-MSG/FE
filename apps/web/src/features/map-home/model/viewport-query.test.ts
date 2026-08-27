import { describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import {
  MAX_VIEWPORT_SPAN_DEG,
  canQueryGrids,
  toGridsRequest,
} from "./viewport-query";

/** 서면 일대 소규모 뷰포트 — span 0.01도 (요청 가능 범위) */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.16, lng: 129.06 },
};

const boundsWithSpan = (latSpan: number, lngSpan: number): Bounds => ({
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.15 + latSpan, lng: 129.05 + lngSpan },
});

describe("뷰포트 → /api/grids 요청 판정 (MSG-325 기준 3)", () => {
  it("Bounds를 명세 파라미터 이름(swLat·swLng·neLat·neLng)으로 옮긴다", () => {
    expect(toGridsRequest(SEOMYEON_VIEWPORT)).toEqual({
      swLat: 35.15,
      swLng: 129.05,
      neLat: 35.16,
      neLng: 129.06,
    });
  });

  it("bounds가 없으면(지도 준비 전) 요청 대상이 아니다", () => {
    expect(canQueryGrids(null)).toBe(false);
  });

  it("한 변 span이 상한 이하면 요청 대상이다 — 경계값 0.5도 포함(명세 '최대 0.5도')", () => {
    expect(canQueryGrids(SEOMYEON_VIEWPORT)).toBe(true);
    expect(canQueryGrids(boundsWithSpan(MAX_VIEWPORT_SPAN_DEG, 0.01))).toBe(
      true,
    );
    expect(canQueryGrids(boundsWithSpan(0.01, MAX_VIEWPORT_SPAN_DEG))).toBe(
      true,
    );
  });

  it("위도·경도 어느 한 변이든 상한을 넘으면 요청 대상이 아니다", () => {
    expect(
      canQueryGrids(boundsWithSpan(MAX_VIEWPORT_SPAN_DEG + 0.001, 0.01)),
    ).toBe(false);
    expect(
      canQueryGrids(boundsWithSpan(0.01, MAX_VIEWPORT_SPAN_DEG + 0.001)),
    ).toBe(false);
  });

  // MSG-477 ③: BUSAN_BBOX 상수가 경계 절단과 함께 삭제돼, 같은 규모(경도 0.51도)의
  // 인라인 bounds로 예시를 교체했다 — 단정 자체(상한 초과 = 요청 제외)는 불변 (C5)
  it("도시 전역급(경도 span 0.51도) 뷰포트는 요청 대상이 아니다 — 상한 초과", () => {
    expect(canQueryGrids(boundsWithSpan(0.3, 0.51))).toBe(false);
  });
});
