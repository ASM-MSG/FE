import { describe, expect, it } from "vitest";
import { cellBoundsAt } from "../../../entities/cell/model/grid";
import { buildHatchSegments } from "./hatch-pattern";

/**
 * AC 9: 교집합(테마 ∩ 내 점령) 셀의 빗금 세그먼트 생성 — 셀 bounds 안에서만
 * 대각선 세그먼트를 만든다 (경계 밖 좌표 없음, 간격 일정).
 */
describe("AC 9 교집합 셀 빗금 세그먼트 (hatch-pattern)", () => {
  const bounds = cellBoundsAt({ col: 239, row: 192 }); // 서면 일대 임의 셀
  const width = bounds.ne.lng - bounds.sw.lng;
  const height = bounds.ne.lat - bounds.sw.lat;
  /** 셀 정규화 좌표(0~1)로 환산 — 대각선 판정용 */
  const normalize = ({ lat, lng }: { lat: number; lng: number }) => ({
    u: (lng - bounds.sw.lng) / width,
    v: (lat - bounds.sw.lat) / height,
  });

  it("모든 세그먼트 끝점이 셀 bounds 안에 있다 (경계 밖 좌표 없음)", () => {
    for (const [from, to] of buildHatchSegments(bounds)) {
      for (const point of [from, to]) {
        expect(point.lat).toBeGreaterThanOrEqual(bounds.sw.lat);
        expect(point.lat).toBeLessThanOrEqual(bounds.ne.lat);
        expect(point.lng).toBeGreaterThanOrEqual(bounds.sw.lng);
        expect(point.lng).toBeLessThanOrEqual(bounds.ne.lng);
      }
    }
  });

  it("세그먼트는 대각선이다 — 양 끝점이 정규화 좌표에서 같은 45° 직선(v-u 동일) 위에 있고 길이가 0이 아니다", () => {
    for (const [from, to] of buildHatchSegments(bounds)) {
      const a = normalize(from);
      const b = normalize(to);
      expect(a.v - a.u).toBeCloseTo(b.v - b.u, 10);
      expect(Math.hypot(b.u - a.u, b.v - a.v)).toBeGreaterThan(0);
    }
  });

  it("빗금 간격이 일정하다 — 대각선 오프셋(v-u)이 등간격", () => {
    const offsets = buildHatchSegments(bounds)
      .map(([from]) => {
        const { u, v } = normalize(from);
        return v - u;
      })
      .sort((a, b) => a - b);
    expect(offsets.length).toBeGreaterThanOrEqual(2);
    const gap = offsets[1] - offsets[0];
    for (let i = 1; i < offsets.length; i += 1) {
      expect(offsets[i] - offsets[i - 1]).toBeCloseTo(gap, 10);
    }
  });

  it("lineCount 지정 시 그 개수만큼 만든다 (기본값은 6)", () => {
    expect(buildHatchSegments(bounds)).toHaveLength(6);
    expect(buildHatchSegments(bounds, 4)).toHaveLength(4);
  });
});
