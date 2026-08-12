import { describe, expect, it, vi } from "vitest";
import { buildCellClickHandler } from "./grid-click-routing";

/**
 * 점령 격자 클릭 우선 라우팅 — 어느 탭(홈·탐색·도감·프로필)에서든, 어떤 선택 상태에서든
 * 점령 격자 클릭은 격자 상세를 우선한다. 점령이 아니면 섹션 핸들러(테마·도감)에 위임한다.
 */
describe("buildCellClickHandler — 점령 격자 우선 라우팅", () => {
  const OCCUPIED = ["16846_11428", "16840_11414"];

  /** 공통 준비 — 점령 목록 고정, 콜백 스파이 쌍 생성 */
  const setup = () => {
    const openGridDetail = vi.fn();
    const sectionHandler = vi.fn();
    const handle = buildCellClickHandler({
      occupiedIds: OCCUPIED,
      openGridDetail,
      sectionHandler,
    });
    return { openGridDetail, sectionHandler, handle };
  };

  it("점령 격자면 격자 상세를 열고 섹션 핸들러는 부르지 않는다", () => {
    const { openGridDetail, sectionHandler, handle } = setup();

    handle("16846_11428");

    expect(openGridDetail).toHaveBeenCalledWith("16846_11428");
    expect(sectionHandler).not.toHaveBeenCalled();
  });

  it("점령이 아니면 섹션 핸들러(테마·도감)에 위임한다", () => {
    const { openGridDetail, sectionHandler, handle } = setup();

    handle("99999_99999");

    expect(openGridDetail).not.toHaveBeenCalled();
    expect(sectionHandler).toHaveBeenCalledWith("99999_99999");
  });

  it("섹션 핸들러가 없으면(탐색·프로필) 비점령 클릭은 무동작이다", () => {
    const openGridDetail = vi.fn();
    const handle = buildCellClickHandler({
      occupiedIds: OCCUPIED,
      openGridDetail,
      sectionHandler: null,
    });

    expect(() => handle("99999_99999")).not.toThrow();
    expect(openGridDetail).not.toHaveBeenCalled();
  });
});
