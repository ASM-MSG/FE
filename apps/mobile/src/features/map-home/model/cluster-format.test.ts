import { describe, expect, it } from "vitest";
import { formatClusterCount } from "./cluster-format";

/**
 * L10: 마커 개수 서식 — 천 단위 구분. 웹은 `toLocaleString("ko-KR")`을 쓰지만 Hermes의
 * Intl 가용성이 빌드 설정에 좌우돼(RN JSC/Hermes intl 변형) 모바일은 정규식으로 직접
 * 넣는다. 표기 동등성은 여기서 Node의 `toLocaleString`과 대조해 고정한다.
 */
const COUNT_SAMPLES = [0, 1, 9, 10, 99, 118, 214, 999, 1000, 1234, 31, 1234567];

/**
 * 음수 표본 — PR #76 리뷰에서 "정규식이 음수에서 toLocaleString과 어긋날 수 있다"는
 * 의문이 제기됐다. 실제로는 `\B` 앵커가 `-`와 첫 숫자 사이(단어 경계)를 건너뛰어
 * 전건 일치하지만, 그 일치는 앵커의 성질에 기대고 있어 정규식을 손대면 조용히 깨진다.
 * 개수는 실운영상 음수가 아니지만, 가정 대신 테스트로 고정해 둔다.
 */
const NEGATIVE_COUNT_SAMPLES = [-1, -12, -1234, -1234567];

describe("formatClusterCount (L10)", () => {
  it("천 단위 구분 콤마를 넣는다 — 1234→'1,234', 214→'214', 0→'0'", () => {
    expect(formatClusterCount(1234)).toBe("1,234");
    expect(formatClusterCount(214)).toBe("214");
    expect(formatClusterCount(0)).toBe("0");
    expect(formatClusterCount(1234567)).toBe("1,234,567");
  });

  it("표본 전건이 웹 표기(toLocaleString('ko-KR'))와 일치한다", () => {
    for (const count of [...COUNT_SAMPLES, ...NEGATIVE_COUNT_SAMPLES]) {
      expect(formatClusterCount(count)).toBe(count.toLocaleString("ko-KR"));
    }
  });

  it("음수도 웹 표기와 일치한다 — 부호 뒤부터 세 자리씩 끊는다 (PR #76 리뷰)", () => {
    expect(formatClusterCount(-1)).toBe("-1");
    expect(formatClusterCount(-1234)).toBe("-1,234");
    expect(formatClusterCount(-1234567)).toBe("-1,234,567");
  });
});
