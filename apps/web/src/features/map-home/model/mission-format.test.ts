import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  formatCourseDuration,
  formatDistanceKm,
  formatMissionPeriod,
  formatOperationTime,
} from "./mission-format";

describe("formatMissionPeriod — 축제 기간 표기 (AC 17)", () => {
  it("시작~종료를 월.일로 잇는다 (AC 17)", () => {
    expect(
      formatMissionPeriod("2026-08-11T00:00:00", "2026-08-16T23:59:59"),
    ).toBe("8.11~8.16");
  });

  it("종료만 있으면 종료일까지로 적는다 (경계)", () => {
    expect(formatMissionPeriod(null, "2026-10-04T23:59:59")).toBe("10.4까지");
  });

  it("둘 다 없으면 상시다 (경계)", () => {
    expect(formatMissionPeriod(null, null)).toBe("상시");
  });
});

describe("formatOperationTime — 팝업 운영시간 폴백 (AC 14)", () => {
  it("운영시간 원문을 그대로 쓴다 (AC 14)", () => {
    expect(formatOperationTime("매일 11:00~22:00")).toBe("매일 11:00~22:00");
  });

  it("운영시간이 없으면 추후공지로 대체한다 (AC 14)", () => {
    expect(formatOperationTime(null)).toBe("운영시간 추후공지");
  });

  it("빈 문자열도 추후공지로 대체한다 (경계)", () => {
    expect(formatOperationTime("")).toBe("운영시간 추후공지");
  });
});

describe("formatDistanceKm — 코스 거리 표기 (AC 22)", () => {
  it("미터를 km로 환산한다 (AC 22)", () => {
    expect(formatDistanceKm(14000)).toBe("14km");
  });

  it("1km 미만은 소수 한 자리로 남긴다 (경계)", () => {
    expect(formatDistanceKm(1400)).toBe("1.4km");
  });

  it("거리가 없으면 null이라 줄을 그리지 않는다 (경계)", () => {
    expect(formatDistanceKm(null)).toBeNull();
  });
});

describe("formatCourseDuration — 코스 소요 시간 표기 (AC 22)", () => {
  it("시간과 분을 함께 적는다 (AC 22)", () => {
    expect(formatCourseDuration(330)).toBe("5시간 30분");
  });

  it("정시면 분을 생략한다 (경계)", () => {
    expect(formatCourseDuration(120)).toBe("2시간");
  });

  it("한 시간 미만이면 분만 적는다 (경계)", () => {
    expect(formatCourseDuration(45)).toBe("45분");
  });

  it("소요 시간이 없으면 null이라 줄을 그리지 않는다 (경계)", () => {
    expect(formatCourseDuration(null)).toBeNull();
  });
});

describe("decodeHtmlEntities — 서버 제목의 HTML 엔티티를 사람이 읽는 글자로 (AC 13)", () => {
  it("작은따옴표 수치 참조를 되돌린다 (AC 13)", () => {
    expect(decodeHtmlEntities("에일리언스테이지 &#x27;AaD&#x27; 팝업")).toBe(
      "에일리언스테이지 'AaD' 팝업",
    );
  });

  it("이름 있는 엔티티(&amp;·&quot;)도 되돌린다 (AC 13)", () => {
    expect(decodeHtmlEntities("A&amp;B &quot;쇼&quot;")).toBe('A&B "쇼"');
  });

  it("십진 수치 참조를 되돌린다 (경계)", () => {
    expect(decodeHtmlEntities("&#39;여름&#39;")).toBe("'여름'");
  });

  it("엔티티가 없으면 원문 그대로다 (경계)", () => {
    expect(decodeHtmlEntities("남파랑길 3코스")).toBe("남파랑길 3코스");
  });

  it("엔티티가 아닌 &는 건드리지 않는다 (경계)", () => {
    expect(decodeHtmlEntities("커피 & 디저트")).toBe("커피 & 디저트");
  });
});
