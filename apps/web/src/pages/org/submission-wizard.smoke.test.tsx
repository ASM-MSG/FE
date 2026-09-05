import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Link, RouterProvider, createMemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { envelopeResponse } from "@/test/envelope-response";
import { OrgSubmissionWizardPage } from "./OrgSubmissionWizardPage";

/**
 * 행사 등록 위저드 흐름 스모크 (AC 1·2·3·4·5·6·9·10·11·13·14·15) —
 * 스텝 1 렌더·유형 선택 전이·소속 이벤트 모달·기본 정보 폼 유형 분기·필수값 CTA·
 * 진행 표시 복귀·작성 중 이탈 경고를 실제 조립으로 고정한다.
 * 데이터 라우터로 렌더한다 — 이탈 경고(useBlocker)가 데이터 라우터를 요구한다.
 */

const PRESIGN_PATH = "/api/org/event-submissions/image/presigned-url";
const UPLOAD_URL = "https://s3.fillmap.test/pending/submissions/abc.jpg?sig=1";

const approvedEvent = (
  occurrenceId: number,
  name: string,
  cityName: string,
) => ({
  occurrenceId,
  name,
  cityName,
  startsAt: "2027-09-12T01:00:00Z",
  endsAt: "2027-09-14T09:00:00Z",
  placeLabel: "벡스코 제1전시장",
});

const APPROVED_EVENTS = [
  approvedEvent(1, "포켓몬 메가페스타 부산", "부산광역시"),
  approvedEvent(2, "광안리 M 드론쇼", "부산광역시"),
  approvedEvent(3, "서울 라이트 페스타", "서울특별시"),
];

const CITY_COUNTS = [
  { cityName: "부산광역시", count: 2 },
  { cityName: "서울특별시", count: 1 },
];

/** 신청 접수 결과 (MSG-548) */
const RECEIPT = { id: 1204, submissionNo: "FM-2026-0007", status: "IN_REVIEW" };

/** 확정 영역 3×3 — 지도 없이 review 스텝을 채우는 재료 (MSG-548) */
const RECT_3X3 = {
  minGridX: 11420,
  maxGridX: 11422,
  minGridY: 16858,
  maxGridY: 16860,
};

/** 승인 이벤트 조회 · presign 발급 · S3 PUT을 한 자리에서 응답한다 */
const wizardFetch = ({ eventsStatus = 200 }: { eventsStatus?: number } = {}) =>
  vi.stubGlobal(
    "fetch",
    async (input: Request | string, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      const { pathname, searchParams } = new URL(url);
      const method =
        (typeof input === "string" ? init?.method : input.method) ?? "GET";

      if (pathname === "/api/org/events") {
        if (eventsStatus !== 200) {
          return new Response("", { status: eventsStatus });
        }
        const city = searchParams.get("city");
        const name = searchParams.get("name");
        const events = APPROVED_EVENTS.filter(
          (event) => city === null || event.cityName === city,
        ).filter((event) => name === null || event.name.includes(name));
        return envelopeResponse({
          totalCount: 3,
          cityCounts: CITY_COUNTS,
          events,
        });
      }
      if (pathname === PRESIGN_PATH) {
        return envelopeResponse({
          uploadUrl: UPLOAD_URL,
          s3Key: "pending/submissions/abc.jpg",
          expiresInSec: 300,
        });
      }
      // MSG-548: 확인·제출 스텝의 신청 제출 — 접수 결과 봉투를 돌려준다
      if (pathname === "/api/org/event-submissions" && method === "POST") {
        return envelopeResponse(RECEIPT);
      }
      if (method === "PUT") return new Response("", { status: 200 });
      return new Response("", { status: 404 });
    },
  );

const WizardHarness = () => (
  <>
    <OrgSubmissionWizardPage />
    <Link to={CONSOLE_ROUTES.orgSubmissions}>내 신청 목록으로</Link>
  </>
);

const renderWizard = (route: string = CONSOLE_ROUTES.orgSubmissionNew) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              path: CONSOLE_ROUTES.orgSubmissionNew,
              element: <WizardHarness />,
            },
            {
              path: CONSOLE_ROUTES.orgSubmissionEdit,
              element: <WizardHarness />,
            },
            {
              path: CONSOLE_ROUTES.orgSubmissions,
              element: <p>내 신청 목록</p>,
            },
            { path: CONSOLE_ROUTES.orgHome, element: <p>운영자 홈</p> },
          ],
          { initialEntries: [route] },
        )}
      />
    </QueryClientProvider>,
  );

const selectFestivalAndContinue = () => {
  fireEvent.click(screen.getByRole("radio", { name: /지역축제/ }));
  fireEvent.click(screen.getByRole("button", { name: "지역축제로 계속" }));
};

/** 기본 정보 필수값을 라벨 기준으로 채운다 (이미지 제외) */
const fillBasicFields = ({
  startsOn = "2027-09-05",
  endsOn = "2027-09-07",
}: { startsOn?: string; endsOn?: string } = {}) => {
  fireEvent.change(screen.getByLabelText("축제명"), {
    target: { value: "광안리 M 드론쇼" },
  });
  fireEvent.change(screen.getByLabelText("주최 기관"), {
    target: { value: "부산광역시 관광마이스과" },
  });
  fireEvent.change(screen.getByLabelText("축제 기간 시작일"), {
    target: { value: startsOn },
  });
  fireEvent.change(screen.getByLabelText("축제 기간 종료일"), {
    target: { value: endsOn },
  });
  fireEvent.change(screen.getByLabelText("주요 프로그램"), {
    target: { value: "드론 공연 · 체험 부스" },
  });
  fireEvent.change(screen.getByLabelText("축제 소개"), {
    target: { value: "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다." },
  });
};

const uploadImage = () =>
  fireEvent.change(screen.getByLabelText("대표 이미지 파일 선택"), {
    target: {
      files: [new File(["binary"], "cover.jpg", { type: "image/jpeg" })],
    },
  });

const originalCreateObjectURL = URL.createObjectURL;

beforeEach(() => {
  useSubmissionWizardStore.setState(
    useSubmissionWizardStore.getInitialState(),
    true,
  );
  URL.createObjectURL = vi.fn(() => "blob:preview-1");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  URL.createObjectURL = originalCreateObjectURL;
});

describe("유형 선택 스텝 (AC 1·2)", () => {
  it("진입 시 유형 카드 3종과 안내가 보이고 계속 버튼은 비활성이다 (AC 1)", () => {
    wizardFetch();

    renderWizard();

    expect(screen.getByText("1 / 4 유형 선택")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "어떤 형태를 등록하시나요?" }),
    ).toBeDefined();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(
      screen.getByText(
        "선택 후에도 기본 정보 단계에서 유형을 바꿀 수 있습니다.",
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "계속" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("지역축제를 고르면 CTA가 '지역축제로 계속'으로 활성화되고 선택 캡션이 뜬다 (AC 2)", () => {
    wizardFetch();
    renderWizard();

    fireEvent.click(screen.getByRole("radio", { name: /지역축제/ }));

    const cta = screen.getByRole("button", { name: "지역축제로 계속" });
    expect(cta.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("선택한 유형: 지역축제")).toBeDefined();
    expect(
      screen
        .getByRole("radio", { name: /지역축제/ })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("계속을 누르면 기본 정보 스텝으로 전이된다 (AC 2·9)", () => {
    wizardFetch();
    renderWizard();

    selectFestivalAndContinue();

    expect(
      screen.getByRole("heading", { name: "지역축제 기본 정보" }),
    ).toBeDefined();
    expect(screen.getByText("2 / 4 기본 정보")).toBeDefined();
  });
});

describe("기본 정보 스텝 (AC 6·9·10·11·13)", () => {
  it("유형별 라벨·CTA·각주가 갈리고 다른 유형 전용 필드는 렌더되지 않는다 (AC 6)", () => {
    wizardFetch();
    renderWizard();

    selectFestivalAndContinue();

    expect(screen.getByLabelText("축제명")).toBeDefined();
    expect(screen.getByLabelText("주요 프로그램")).toBeDefined();
    expect(screen.queryByLabelText("운영 시간")).toBeNull();
    expect(screen.queryByLabelText("참여 방식")).toBeNull();
    expect(
      screen.getByRole("button", { name: "다음: 축제 위치 등록" }),
    ).toBeDefined();
    expect(
      screen.getByText(
        "행사 등록은 건별 관리자 승인 후 일반 유저 지도와 기존 행사방에 노출됩니다.",
      ),
    ).toBeDefined();
  });

  it("필수값이 다 차면 CTA가 활성되고 위치 스텝 자리표시로 전이된다 (AC 10)", async () => {
    wizardFetch();
    renderWizard();
    selectFestivalAndContinue();

    fillBasicFields();
    uploadImage();

    const cta = screen.getByRole("button", { name: "다음: 축제 위치 등록" });
    await waitFor(() => expect(cta.hasAttribute("disabled")).toBe(false));
    fireEvent.click(cta);
    // MSG-547에서 area 스텝이 자리표시(제목 = 스텝 이름)를 벗고 실화면이 됐다 —
    // 제목은 시안 문구 "위치 영역 지정"이고 스텝 표시("3 / 4 위치 영역")는 그대로다
    expect(
      screen.getByRole("heading", { name: "위치 영역 지정" }),
    ).toBeDefined();
    expect(screen.getByText("3 / 4 위치 영역")).toBeDefined();
  });

  it("이미지가 없으면 CTA가 비활성이다 (AC 10)", () => {
    wizardFetch();
    renderWizard();
    selectFestivalAndContinue();

    fillBasicFields();

    expect(
      screen
        .getByRole("button", { name: "다음: 축제 위치 등록" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("종료일이 시작일보다 앞서면 안내가 뜨고 진행이 막힌다 (AC 11)", async () => {
    wizardFetch();
    renderWizard();
    selectFestivalAndContinue();

    fillBasicFields({ startsOn: "2027-09-07", endsOn: "2027-09-05" });
    uploadImage();

    await waitFor(() =>
      expect(
        screen.getByText("종료일은 시작일과 같거나 이후여야 해요"),
      ).toBeDefined(),
    );
    expect(
      screen
        .getByRole("button", { name: "다음: 축제 위치 등록" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("진행 표시의 완료 스텝을 누르면 유형 선택으로 돌아가고 공통 입력은 유지된다 (AC 9·13)", () => {
    wizardFetch();
    renderWizard();
    selectFestivalAndContinue();
    fireEvent.change(screen.getByLabelText("축제명"), {
      target: { value: "광안리 M 드론쇼" },
    });

    fireEvent.click(screen.getByRole("button", { name: "유형 선택" }));

    expect(
      screen.getByRole("heading", { name: "어떤 형태를 등록하시나요?" }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: /팝업스토어/ }));
    fireEvent.click(screen.getByRole("button", { name: "팝업스토어로 계속" }));

    expect(screen.getByLabelText("팝업명")).toHaveProperty(
      "value",
      "광안리 M 드론쇼",
    );
    expect(screen.getByLabelText("운영 시간")).toBeDefined();
  });
});

describe("소속 이벤트 선택 모달 (AC 3·4·5)", () => {
  it("이벤트 카드를 고르면 모달이 열려 시·도 칩과 전체 건수를 보여준다 (AC 3)", async () => {
    wizardFetch();
    renderWizard();

    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));

    // 모달 존재 증거는 시·도 선택 섹션 라벨로 잡는다 — 타이틀은 DialogShell의
    // 스크린리더 전용 제목과 ModalCard 헤딩 둘로 렌더된다(ReportDialog 선례 구조)
    expect(await screen.findByText("1 · 시·도 선택")).toBeDefined();
    expect(
      await screen.findByRole("button", { name: "부산광역시" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "서울특별시" })).toBeDefined();
    expect(screen.getByRole("button", { name: "전체 보기" })).toBeDefined();
    expect(screen.getByText("전체 · 승인 이벤트 3건")).toBeDefined();
  });

  it("시·도 칩을 고르면 목록이 필터되고 건수 라벨이 갱신된다 (AC 3)", async () => {
    wizardFetch();
    renderWizard();
    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));
    await screen.findByRole("radio", { name: /포켓몬 메가페스타 부산/ });

    fireEvent.click(screen.getByRole("button", { name: "서울특별시" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("radio", { name: /포켓몬 메가페스타 부산/ }),
      ).toBeNull(),
    );
    expect(screen.getByText("서울특별시 · 승인 이벤트 1건")).toBeDefined();
    expect(
      screen.getByRole("radio", { name: /서울 라이트 페스타/ }),
    ).toBeDefined();
  });

  it("검색어를 넣으면 서버 검색 결과로 목록이 좁혀진다 (AC 4)", async () => {
    wizardFetch();
    renderWizard();
    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));
    await screen.findByRole("radio", { name: /포켓몬 메가페스타 부산/ });

    fireEvent.change(screen.getByLabelText("이벤트 이름으로 검색"), {
      target: { value: "드론" },
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("radio", { name: /포켓몬 메가페스타 부산/ }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("radio", { name: /광안리 M 드론쇼/ }),
    ).toBeDefined();
    // 칩·건수 라벨은 검색 중에도 고정이다 (서버 계약)
    expect(screen.getByText("전체 · 승인 이벤트 3건")).toBeDefined();
    expect(screen.getByRole("button", { name: "부산광역시" })).toBeDefined();
  });

  it("결과가 없으면 빈 상태를 안내한다 (AC 4)", async () => {
    wizardFetch();
    renderWizard();
    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));
    await screen.findByRole("radio", { name: /포켓몬 메가페스타 부산/ });

    fireEvent.change(screen.getByLabelText("이벤트 이름으로 검색"), {
      target: { value: "없는이름" },
    });

    expect(
      await screen.findByText("조건에 맞는 승인 이벤트가 없어요"),
    ).toBeDefined();
  });

  it("목록 조회가 실패하면 재시도 안내가 뜬다 (AC 4)", async () => {
    wizardFetch({ eventsStatus: 500 });
    renderWizard();

    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));

    expect(
      await screen.findByText("이벤트 목록을 불러오지 못했어요"),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeDefined();
  });

  it("이벤트를 골라야 확정 버튼이 활성되고 확정 시 EVENT 폼으로 전이된다 (AC 5)", async () => {
    wizardFetch();
    renderWizard();
    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));
    await screen.findByRole("radio", { name: /포켓몬 메가페스타 부산/ });
    expect(
      screen
        .getByRole("button", { name: "이벤트 선택" })
        .hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("radio", { name: /포켓몬 메가페스타 부산/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "포켓몬 메가페스타 부산으로 계속" }),
    );

    expect(
      screen.getByRole("heading", { name: "이벤트 기본 정보" }),
    ).toBeDefined();
    expect(screen.getByLabelText("행사방 이름")).toBeDefined();
    expect(screen.getByLabelText("참여 방식")).toBeDefined();
    expect(screen.queryByLabelText("주요 프로그램")).toBeNull();
  });

  it("취소하면 유형 확정 없이 모달만 닫힌다 (AC 5 — 추정 3)", async () => {
    wizardFetch();
    renderWizard();
    fireEvent.click(screen.getByRole("radio", { name: /이벤트/ }));
    await screen.findByText("1 · 시·도 선택");

    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByText("1 · 시·도 선택")).toBeNull();
    expect(
      screen.getByRole("button", { name: "계속" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.queryByText(/선택한 유형/)).toBeNull();
  });
});

describe("이탈 경고와 재진입 (AC 14·15)", () => {
  it("작성 중 위저드 밖으로 이동하면 확인을 받고, 취소 시 머무른다 (AC 14)", () => {
    wizardFetch();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWizard();
    selectFestivalAndContinue();

    fireEvent.click(screen.getByRole("link", { name: "내 신청 목록으로" }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("heading", { name: "지역축제 기본 정보" }),
    ).toBeDefined();
  });

  it("확인하면 위저드를 떠난다 (AC 14)", async () => {
    wizardFetch();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWizard();
    selectFestivalAndContinue();

    fireEvent.click(screen.getByRole("link", { name: "내 신청 목록으로" }));

    expect(await screen.findByText("내 신청 목록")).toBeDefined();
  });

  it("작성 전에는 경고 없이 이동한다 (AC 14)", async () => {
    wizardFetch();
    const confirmSpy = vi.spyOn(window, "confirm");
    renderWizard();

    fireEvent.click(screen.getByRole("link", { name: "내 신청 목록으로" }));

    expect(await screen.findByText("내 신청 목록")).toBeDefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("수정 모드 경로(/edit)도 같은 위저드 페이지를 렌더한다 (AC 15)", async () => {
    wizardFetch();

    renderWizard("/org/submissions/1204/edit");

    // MSG-550이 `/edit`를 수정 모드로 실구현하며 **빈 위저드가 아니라** 신청 상세를
    // 프리필하는 화면이 됐다(AC 1) — 유형 선택 스텝 단정은 그 티켓의 요구로 폐기하고,
    // 이 스모크가 지키려던 계약("같은 페이지가 이 경로를 렌더한다")은 페이지 h1으로 본다.
    // 프리필 동선 자체는 `submission-edit.smoke`가 상세 스텁과 함께 검증한다.
    expect(
      await screen.findByRole("heading", {
        name: "수정 후 재제출",
        level: 1,
      }),
    ).toBeDefined();
  });

  it("제출 성공 시 이탈 경고 없이 내 신청 목록으로 이동한다 (MSG-548 AC 9)", async () => {
    wizardFetch();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWizard();
    // 페이지가 마운트 시 스토어를 리셋하므로 렌더 뒤에 review 스텝 상태를 심는다
    // (지도 드래그로 영역을 확정하는 경로는 브라우저 실동작 검증 몫 — MSG-547 선례)
    act(() => {
      const store = useSubmissionWizardStore.getState();
      store.selectType("FESTIVAL");
      store.setCommonField("title", "광안리 M 드론쇼");
      store.setCommonField("organizerName", "부산광역시 관광마이스과");
      store.setCommonField("startsOn", "2027-09-05");
      store.setCommonField("endsOn", "2027-09-07");
      store.setCommonField("description", "정기 드론 공연입니다.");
      store.setTypeFieldValue("드론 공연 · 체험 부스");
      store.startImageUpload("blob:preview-1");
      store.completeImageUpload("pending/submissions/abc.jpg");
      store.addAreaRect(RECT_3X3);
      store.goToStep("review");
    });

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "입력한 내용이 사실과 다르지 않음을 확인합니다.",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "행사 등록 신청 제출" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "제출하기" }));

    expect(await screen.findByText("내 신청 목록")).toBeDefined();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("재진입하면 위저드가 초기 상태다 (AC 14)", () => {
    wizardFetch();
    const first = renderWizard();
    selectFestivalAndContinue();
    first.unmount();

    renderWizard();

    expect(
      screen.getByRole("heading", { name: "어떤 형태를 등록하시나요?" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "계속" }).hasAttribute("disabled"),
    ).toBe(true);
  });
});
