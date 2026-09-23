import { describe, expect, it } from "vitest";

import { assembleFullName, createFullNameRetainer } from "./apple-full-name";

/**
 * 템플릿 ① 순수 로직 — 애플 `fullName` 조립·보관 (MSG-601 L1·L8).
 * 애플은 이름을 `{ familyName, givenName }`으로 쪼개 주고 **첫 승인에만** 준다(BE 계약 4항).
 * 서버는 한 문자열을 받으므로 여기서 조립하고, 첫 시도가 서버 오류로 실패하면 재시도에
 * 다시 실을 수 있게 프로세스 동안 들고 있는다.
 */
describe("assembleFullName (L1)", () => {
  it("성과 이름을 공백 없이 붙여 돌려준다 — 한국어 이름 관례(BE 계약 4항)", () => {
    expect(assembleFullName({ familyName: "김", givenName: "필맵" })).toBe(
      "김필맵",
    );
  });

  it("둘 중 하나만 있으면 그것만 돌려준다", () => {
    expect(assembleFullName({ familyName: "김", givenName: null })).toBe("김");
    expect(assembleFullName({ familyName: undefined, givenName: "필맵" })).toBe(
      "필맵",
    );
  });

  it("둘 다 없거나 인자가 null·undefined면 undefined를 돌려준다 (경계)", () => {
    expect(assembleFullName({ familyName: null, givenName: null })).toBe(
      undefined,
    );
    expect(assembleFullName(null)).toBe(undefined);
    expect(assembleFullName(undefined)).toBe(undefined);
  });

  it("공백만 있는 값은 없는 것으로 본다 — 앞뒤 공백은 trim한다 (경계)", () => {
    expect(assembleFullName({ familyName: "  ", givenName: " 필맵 " })).toBe(
      "필맵",
    );
  });
});

describe("createFullNameRetainer (L8)", () => {
  it("첫 시도의 fullName을 기억해, 다음 시도에서 애플이 이름을 주지 않아도 이전 값을 돌려준다", () => {
    const retainer = createFullNameRetainer();

    expect(retainer.remember("김필맵")).toBe("김필맵");
    expect(retainer.remember(undefined)).toBe("김필맵");
  });

  it("새 값이 오면 그 값으로 갈아치운다", () => {
    const retainer = createFullNameRetainer();
    retainer.remember("김필맵");

    expect(retainer.remember("이필맵")).toBe("이필맵");
    expect(retainer.remember(undefined)).toBe("이필맵");
  });

  it("아무것도 기억한 적이 없으면 undefined다 (경계)", () => {
    expect(createFullNameRetainer().remember(undefined)).toBe(undefined);
  });
});
