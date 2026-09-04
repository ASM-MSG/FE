import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AreaRect } from "@/features/event-submission/model/submission-area";
import type { SubmissionType } from "@/features/event-submission/model/submission-form";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { renderWithProviders } from "@/test/render-with-providers";
import { stubFetch } from "@/test/stub-fetch";
import { areaRect } from "@/test/submission-draft-fixture";
import { WizardStepSwitch } from "./WizardStepSwitch";

/**
 * 확인·제출 스텝 흐름 스모크 (MSG-548 AC 1·2·3·4·5·6·8·11) — 스텝 본문 스위치로 실제
 * 조립해 요약 렌더·수정 복귀 왕복·체크 게이트·확인 모달 게이트·POST 계수·중복 제출 차단·
 * 실패 유지를 고정한다.
 *
 * 성공 후 이동(AC 9)과 이탈 경고 미발화는 데이터 라우터가 필요해 페이지 흐름 스모크
 * (`submission-wizard.smoke`)가 담당한다 — 여기서는 성공 시 스토어 리셋까지만 본다.
 * 지도(AreaMapCanvas)는 jsdom에 키가 없어 폴백으로 렌더된다(MSG-547 스모크와 같은 전제).
 */

/** 3×3(9칸) + 겹치지 않는 2×2(4칸) = 합집합 13칸 */
const RECT_3X3 = areaRect(11420, 16858, 11422, 16860);
const RECT_2X2 = areaRect(11430, 16868, 11431, 16869);

const RECEIPT = { id: 1204, submissionNo: "FM-2026-0007", status: "IN_REVIEW" };

const SUBMIT_PATH = "/api/org/event-submissions";

const WizardBody = () => {
  const step = useSubmissionWizardStore((state) => state.step);
  return <WizardStepSwitch step={step} />;
};

const enterReviewStep = ({
  type = "FESTIVAL" as SubmissionType,
  rects = [RECT_3X3, RECT_2X2],
  parent = null as { occurrenceId: number; name: string } | null,
}: {
  type?: SubmissionType;
  rects?: AreaRect[];
  parent?: { occurrenceId: number; name: string } | null;
} = {}) => {
  const store = useSubmissionWizardStore.getState();
  if (parent === null) {
    store.selectType(type);
  } else {
    store.confirmEventParent(parent);
  }
  store.setCommonField("title", "광안리 M 드론쇼");
  store.setCommonField("organizerName", "부산광역시 관광마이스과");
  store.setCommonField("startsOn", "2026-09-05");
  store.setCommonField("endsOn", "2026-09-07");
  store.setCommonField(
    "description",
    "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
  );
  store.setTypeFieldValue("드론 공연 · 체험 부스");
  store.startImageUpload("blob:preview-1");
  store.completeImageUpload("pending/submissions/abc.jpg");
  for (const rect of rects) store.addAreaRect(rect);
  store.goToStep("review");
  return renderWithProviders(<WizardBody />);
};

const submitButton = () =>
  screen.getByRole("button", { name: "행사 등록 신청 제출" });

const checkFactConfirm = () =>
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "입력한 내용이 사실과 다르지 않음을 확인합니다.",
    }),
  );

/** 제출 POST만 계수한다 — 스텁이 다른 경로도 받아 넘긴다 */
const submitRequests = (received: { request: Request }[]) =>
  received.filter(
    ({ request }) => new URL(request.url).pathname === SUBMIT_PATH,
  );

beforeEach(() => {
  useSubmissionWizardStore.setState(
    useSubmissionWizardStore.getInitialState(),
    true,
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("확인·제출 스텝 진입 렌더 (AC 1·2·3)", () => {
  it("스텝 표시·제목·부제·유형 뱃지·요약 카드 2종·미체크 체크박스·버튼 2종·각주가 렌더된다 (AC 1)", () => {
    enterReviewStep();

    expect(screen.getByText("4 / 4 확인·제출")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "신청 전 최종 검토" }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "제출하면 운영팀 심사가 시작됩니다. 심사 중에는 내용을 수정할 수 없어요.",
      ),
    ).toBeDefined();
    expect(screen.getByText("유형 · 지역축제")).toBeDefined();
    expect(screen.getByRole("heading", { name: "기본 정보" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "위치 영역" })).toBeDefined();
    expect(
      screen
        .getByRole("checkbox", {
          name: "입력한 내용이 사실과 다르지 않음을 확인합니다.",
        })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(screen.getByRole("button", { name: "이전" })).toBeDefined();
    expect(submitButton().hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText(
        "제출 후에는 「내 신청 목록」에서 심사 상태를 확인할 수 있습니다. 심사는 보통 1~2영업일이 걸립니다.",
      ),
    ).toBeDefined();
  });

  it("기본 정보 카드가 스토어 입력·유형 라벨·기간 표기를 그대로 보여준다 (AC 2)", () => {
    enterReviewStep();

    expect(screen.getByText("광안리 M 드론쇼")).toBeDefined();
    expect(screen.getByText("부산광역시 관광마이스과 주최")).toBeDefined();
    expect(screen.getByText("주최 기관")).toBeDefined();
    expect(screen.getByText("축제 기간")).toBeDefined();
    expect(screen.getByText("2026. 9. 5 – 2026. 9. 7")).toBeDefined();
    expect(screen.getByText("주요 프로그램")).toBeDefined();
    expect(screen.getByText("드론 공연 · 체험 부스")).toBeDefined();
    expect(screen.getByText("축제 소개")).toBeDefined();
    expect(screen.getByAltText("대표 이미지 미리보기")).toBeDefined();
  });

  it("이벤트 유형이면 소속 이벤트 행이 더해진다 (AC 2 — 추정 3)", () => {
    enterReviewStep({
      type: "EVENT",
      parent: { occurrenceId: 412, name: "포켓몬 메가페스타 부산" },
    });

    expect(screen.getByText("소속 이벤트")).toBeDefined();
    expect(screen.getByText("포켓몬 메가페스타 부산")).toBeDefined();
  });

  it("위치 영역 카드가 합집합 칸수와 사각형 행 목록을 보여준다 (AC 3)", () => {
    enterReviewStep();

    expect(screen.getByText("1곳 · 사각형 2개")).toBeDefined();
    expect(screen.getByText("총 13칸")).toBeDefined();
    expect(screen.getByText("영역 1 · 가로 3 × 세로 3 · 9칸")).toBeDefined();
    expect(screen.getByText("영역 2 · 가로 2 × 세로 2 · 4칸")).toBeDefined();
  });
});

describe("수정 복귀와 재도달 (AC 4)", () => {
  it("기본 정보 카드의 수정은 basic 스텝으로 돌아가고 입력이 보존된다 (AC 4)", () => {
    enterReviewStep();

    fireEvent.click(screen.getByRole("button", { name: "기본 정보 수정" }));

    expect(
      screen.getByRole("heading", { name: "지역축제 기본 정보" }),
    ).toBeDefined();
    expect(screen.getByLabelText("축제명")).toHaveProperty(
      "value",
      "광안리 M 드론쇼",
    );
  });

  it("위치 영역 카드의 수정은 area 스텝으로 돌아가고 확정 영역이 보존된다 (AC 4)", () => {
    enterReviewStep();

    fireEvent.click(screen.getByRole("button", { name: "위치 영역 수정" }));

    expect(
      screen.getByRole("heading", { name: "위치 영역 지정" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("progressbar", { name: "사용한 칸" })
        .getAttribute("aria-valuenow"),
    ).toBe("13");
  });

  it("하단 '이전'도 area 스텝 복귀다 (AC 4 — 추정 9)", () => {
    enterReviewStep();

    fireEvent.click(screen.getByRole("button", { name: "이전" }));

    expect(
      screen.getByRole("heading", { name: "위치 영역 지정" }),
    ).toBeDefined();
  });

  it("basic으로 복귀한 뒤 기존 전진 경로로 review에 다시 도달하며 입력·영역이 그대로다 (AC 4)", async () => {
    enterReviewStep();
    fireEvent.click(screen.getByRole("button", { name: "기본 정보 수정" }));

    const cta = screen.getByRole("button", { name: "다음: 축제 위치 등록" });
    await waitFor(() => expect(cta.hasAttribute("disabled")).toBe(false));
    fireEvent.click(cta);
    fireEvent.click(screen.getByRole("button", { name: "위치 저장" }));

    expect(
      screen.getByRole("heading", { name: "신청 전 최종 검토" }),
    ).toBeDefined();
    expect(screen.getByText("총 13칸")).toBeDefined();
    expect(screen.getByText("광안리 M 드론쇼")).toBeDefined();
  });
});

describe("사실 확인 체크 게이트 (AC 5)", () => {
  it("체크하면 제출 버튼이 활성화되고 해제하면 다시 비활성이다 (AC 5)", () => {
    enterReviewStep();

    checkFactConfirm();
    expect(submitButton().hasAttribute("disabled")).toBe(false);

    checkFactConfirm();
    expect(submitButton().hasAttribute("disabled")).toBe(true);
  });

  it("review를 떠났다 재진입하면 체크가 해제 상태다 (AC 5 — 추정 4)", () => {
    enterReviewStep();
    checkFactConfirm();

    fireEvent.click(screen.getByRole("button", { name: "이전" }));
    fireEvent.click(screen.getByRole("button", { name: "위치 저장" }));

    expect(
      screen
        .getByRole("checkbox", {
          name: "입력한 내용이 사실과 다르지 않음을 확인합니다.",
        })
        .getAttribute("aria-checked"),
    ).toBe("false");
    expect(submitButton().hasAttribute("disabled")).toBe(true);
  });
});

describe("확인 모달과 제출 (AC 6·7·8·11)", () => {
  it("제출 버튼은 확인 모달만 열고 이 시점까지 POST는 발사되지 않는다 (AC 6)", () => {
    const received = stubFetch(() => envelopeResponse(RECEIPT));
    enterReviewStep();
    checkFactConfirm();

    fireEvent.click(submitButton());

    expect(screen.getByRole("button", { name: "제출하기" })).toBeDefined();
    expect(submitRequests(received)).toHaveLength(0);
  });

  it("모달의 취소는 모달만 닫고 POST를 발사하지 않는다 (AC 6)", () => {
    const received = stubFetch(() => envelopeResponse(RECEIPT));
    enterReviewStep();
    checkFactConfirm();
    fireEvent.click(submitButton());

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByRole("button", { name: "제출하기" })).toBeNull();
    expect(submitRequests(received)).toHaveLength(0);
  });

  it("'제출하기'는 POST를 1회 발사하고 성공 시 스토어를 리셋한다 (AC 7·9)", async () => {
    const received = stubFetch(() => envelopeResponse(RECEIPT));
    enterReviewStep();
    checkFactConfirm();
    fireEvent.click(submitButton());

    fireEvent.click(screen.getByRole("button", { name: "제출하기" }));

    await waitFor(() =>
      expect(useSubmissionWizardStore.getState().step).toBe("type"),
    );
    expect(submitRequests(received)).toHaveLength(1);
    expect(useSubmissionWizardStore.getState().areaRects).toEqual([]);
  });

  it("제출 중에는 모달 버튼이 잠겨 재클릭해도 POST가 늘지 않는다 (AC 8)", async () => {
    const received = stubFetch(() => new Promise<Response>(() => {}));
    enterReviewStep();
    checkFactConfirm();
    fireEvent.click(submitButton());
    const confirm = screen.getByRole("button", { name: "제출하기" });

    fireEvent.click(confirm);
    await waitFor(() => expect(confirm.hasAttribute("disabled")).toBe(true));
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(submitRequests(received)).toHaveLength(1);
    // 취소도 잠긴다 — 발사된 요청의 결과를 보여 줄 자리를 잃지 않기 위해 (추정 6)
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByRole("button", { name: "제출 중" })).toBeDefined();
  });

  it("실패하면 모달이 유지된 채 사유가 안내되고 재시도로 제출된다 (AC 11)", async () => {
    let attempt = 0;
    const received = stubFetch(() => {
      attempt += 1;
      return attempt === 1
        ? errorEnvelope(13433, "종료일이 오늘 이전입니다", 400)
        : envelopeResponse(RECEIPT);
    });
    enterReviewStep();
    checkFactConfirm();
    fireEvent.click(submitButton());

    fireEvent.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("기간");
    fireEvent.click(screen.getByRole("button", { name: "제출하기" }));

    await waitFor(() =>
      expect(useSubmissionWizardStore.getState().step).toBe("type"),
    );
    expect(submitRequests(received)).toHaveLength(2);
  });

  it("실패 후 모달을 닫았다 재오픈하면 이전 실패 안내가 남지 않는다 (AC 11 — PR #140 리뷰 반영)", async () => {
    stubFetch(() => errorEnvelope(13433, "종료일이 오늘 이전입니다", 400));
    enterReviewStep();
    checkFactConfirm();
    fireEvent.click(submitButton());
    fireEvent.click(screen.getByRole("button", { name: "제출하기" }));
    expect(await screen.findByRole("alert")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(submitButton());

    expect(screen.getByRole("button", { name: "제출하기" })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
