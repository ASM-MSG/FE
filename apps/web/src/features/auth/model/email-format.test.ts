import { describe, expect, it } from "vitest";
import { isEmailFormat } from "./email-format";

describe("isEmailFormat — 재설정 요청 이메일 형식 판정 (AC 9)", () => {
  it("로컬부와 점 있는 도메인을 갖추면 형식을 충족한다 (AC 9)", () => {
    expect(isEmailFormat("tourism@busan.go.kr")).toBe(true);
  });

  it("@가 없으면 형식 미충족이다 (AC 9)", () => {
    expect(isEmailFormat("tourism.busan.go.kr")).toBe(false);
  });

  it("도메인에 점이 없으면 형식 미충족이다 (AC 9)", () => {
    expect(isEmailFormat("tourism@busan")).toBe(false);
  });

  it("공백이 섞이면 형식 미충족이다 (AC 9)", () => {
    expect(isEmailFormat("tourism @busan.go.kr")).toBe(false);
  });

  it("빈 문자열은 형식 미충족이다 — 경계 (AC 9)", () => {
    expect(isEmailFormat("")).toBe(false);
  });
});
