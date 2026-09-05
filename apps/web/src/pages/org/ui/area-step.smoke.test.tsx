import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AreaRect } from "@/features/event-submission/model/submission-area";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { renderWithProviders } from "@/test/render-with-providers";
import { WizardStepSwitch } from "./WizardStepSwitch";

/**
 * 위치 영역 스텝 흐름 스모크 (MSG-547 AC 1·5·6·10·11) — 스텝 본문 스위치로 실제 조립해
 * 진입 렌더·확정 목록·삭제 재계산·저장 전이·기본 정보 복귀를 고정한다.
 *
 * 지도(AreaMapCanvas)는 jsdom에 네이버 키가 없어 폴백으로 렌더된다 — 드래그로 후보를
 * 만드는 경로는 브라우저 실동작 검증 몫이고, 후보 카드 계약은 area-draft-card 스모크가
 * 따로 고정한다. 여기서는 확정 영역을 스토어에 심어 목록·합집합·CTA 계약을 본다.
 */

/** 3×3(9칸) 확정 영역 — 서면 격자 인덱스 */
const RECT_3X3: AreaRect = {
  minGridX: 11420,
  maxGridX: 11422,
  minGridY: 16858,
  maxGridY: 16860,
};
/** 2×2(4칸) — 겹치지 않는 두 번째 영역 */
const RECT_2X2: AreaRect = {
  minGridX: 11430,
  maxGridX: 11431,
  minGridY: 16868,
  maxGridY: 16869,
};

/** 스텝 전이를 화면으로 관찰하기 위해 스토어 스텝을 그대로 따라가는 본문 하네스 */
const WizardBody = () => {
  const step = useSubmissionWizardStore((state) => state.step);
  return <WizardStepSwitch step={step} />;
};

const enterAreaStep = (areaRects: AreaRect[] = []) => {
  const store = useSubmissionWizardStore.getState();
  store.selectType("FESTIVAL");
  areaRects.forEach((rect) => store.addAreaRect(rect));
  store.goToStep("area");
  return renderWithProviders(<WizardBody />);
};

describe("위치 영역 스텝 (AC 1·5·6·10·11)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  afterEach(() => cleanup());

  it("진입하면 스텝 표시·제목·부제·위치 카드(0/81)·검색 이동 안내·빈 목록이 렌더된다 (AC 1)", () => {
    enterAreaStep();

    expect(screen.getByText("3 / 4 위치 영역")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "위치 영역 지정" }),
    ).toBeDefined();
    expect(
      screen.getByText("시작점을 누른 채 끝점까지 드래그하세요."),
    ).toBeDefined();
    expect(screen.getByText("위치 1")).toBeDefined();
    expect(screen.getByText("사용한 칸 0 / 81")).toBeDefined();
    expect(screen.getByText("검색은 지도 이동에만 사용됩니다")).toBeDefined();
    expect(screen.getByText("아직 추가한 영역이 없어요")).toBeDefined();
  });

  it("확정 영역이 없으면 '위치 저장'이 비활성이다 (AC 10)", () => {
    enterAreaStep();

    expect(
      screen
        .getByRole("button", { name: "위치 저장" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("확정 영역은 목록 행으로 쌓이고 사용한 칸은 합집합으로 표시된다 (AC 5)", () => {
    enterAreaStep([RECT_3X3, RECT_2X2]);

    expect(screen.getByText("영역 1 · 가로 3 × 세로 3 · 9칸")).toBeDefined();
    expect(screen.getByText("영역 2 · 가로 2 × 세로 2 · 4칸")).toBeDefined();
    expect(screen.getByText("사용한 칸 13 / 81")).toBeDefined();
  });

  it("목록에서 영역을 삭제하면 사용한 칸이 재계산된다 (AC 6)", () => {
    enterAreaStep([RECT_3X3, RECT_2X2]);

    fireEvent.click(screen.getByRole("button", { name: "영역 1 삭제" }));

    expect(screen.getByText("사용한 칸 4 / 81")).toBeDefined();
    expect(screen.getByText("영역 1 · 가로 2 × 세로 2 · 4칸")).toBeDefined();
  });

  it("영역이 1개 이상이면 '위치 저장'으로 확인·제출 스텝으로 전이된다 (AC 10)", () => {
    enterAreaStep([RECT_3X3]);
    const save = screen.getByRole("button", { name: "위치 저장" });
    expect(save.hasAttribute("disabled")).toBe(false);

    fireEvent.click(save);

    expect(screen.getByText("4 / 4 확인·제출")).toBeDefined();
    expect(useSubmissionWizardStore.getState().areaRects).toEqual([RECT_3X3]);
  });

  it("'‹ 기본 정보'를 누르면 기본 정보 스텝으로 돌아가고 확정 영역은 보존된다 (AC 11)", () => {
    enterAreaStep([RECT_3X3]);

    fireEvent.click(screen.getByRole("button", { name: "‹ 기본 정보" }));

    expect(
      screen.getByRole("heading", { name: "지역축제 기본 정보" }),
    ).toBeDefined();
    expect(useSubmissionWizardStore.getState().areaRects).toEqual([RECT_3X3]);
  });
});
