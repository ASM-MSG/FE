import { describe, expect, it } from "vitest";
import { clusterMarkerLabel, formatClusterCount } from "./cluster-format";

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

/**
 * L11 (MSG-558 확장): 말풍선 접근명 — 웹 `MapCanvas.clusterMarkerTitle`과 같은 4경우.
 * 주어는 칩 라벨(`THEME_META[theme].label`), 칩이 없으면 "점령 격자".
 */
describe("clusterMarkerLabel (L11)", () => {
  const base = {
    id: "x",
    position: { lat: 0, lng: 0 },
    unit: "DONG" as const,
  };

  it("theme이 없으면 '{name} 점령 격자 N개'다 — 종전 접근명 보존", () => {
    expect(clusterMarkerLabel({ ...base, name: "부전2동", count: 31 })).toBe(
      "부전2동 점령 격자 31개",
    );
  });

  it("theme이 있으면 주어가 칩 라벨이다 — 핫구역·지역축제·팝업스토어", () => {
    expect(
      clusterMarkerLabel({ ...base, name: "부전2동", count: 4, theme: "hot" }),
    ).toBe("부전2동 핫구역 4개");
    expect(
      clusterMarkerLabel({
        ...base,
        name: "동구",
        count: 2,
        theme: "festival",
      }),
    ).toBe("동구 지역축제 2개");
    expect(
      clusterMarkerLabel({ ...base, name: "서구", count: 7, theme: "popup" }),
    ).toBe("서구 팝업스토어 7개");
  });

  it("name이 null이면 이름을 생략한다 — 테마 유무 양쪽", () => {
    expect(clusterMarkerLabel({ ...base, name: null, count: 3 })).toBe(
      "점령 격자 3개",
    );
    expect(
      clusterMarkerLabel({ ...base, name: null, count: 3, theme: "festival" }),
    ).toBe("지역축제 3개");
  });
});
