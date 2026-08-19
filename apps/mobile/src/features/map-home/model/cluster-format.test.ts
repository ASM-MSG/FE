import { describe, expect, it } from "vitest";
import { formatClusterCount } from "./cluster-format";

/**
 * L10: 마커 개수 서식 — 천 단위 구분. 웹은 `toLocaleString("ko-KR")`을 쓰지만 Hermes의
 * Intl 가용성이 빌드 설정에 좌우돼(RN JSC/Hermes intl 변형) 모바일은 정규식으로 직접
 * 넣는다. 표기 동등성은 여기서 Node의 `toLocaleString`과 대조해 고정한다.
 */
const COUNT_SAMPLES = [0, 1, 9, 10, 99, 118, 214, 999, 1000, 1234, 31, 1234567];

describe("formatClusterCount (L10)", () => {
  it("천 단위 구분 콤마를 넣는다 — 1234→'1,234', 214→'214', 0→'0'", () => {
    expect(formatClusterCount(1234)).toBe("1,234");
    expect(formatClusterCount(214)).toBe("214");
    expect(formatClusterCount(0)).toBe("0");
    expect(formatClusterCount(1234567)).toBe("1,234,567");
  });

  it("표본 전건이 웹 표기(toLocaleString('ko-KR'))와 일치한다", () => {
    for (const count of COUNT_SAMPLES) {
      expect(formatClusterCount(count)).toBe(count.toLocaleString("ko-KR"));
    }
  });
});
