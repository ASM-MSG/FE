import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { todayKstDate } from "@/features/dex/model/upload-grass";
import { stubDexFetch } from "./dex-fetch-stub";
import { renderDexPanel, resetDexStores } from "./dex-test-harness";
import { RecordTabBody } from "./ui/RecordTabBody";

/**
 * 기록 탭(업로드 잔디) 스모크 (MSG-414 AC 2·7·9·10) — 실 API 스텁 위에서 탭 진입,
 * 메타 라인 실데이터 파생, 1년 모달 열림/닫힘, 게이트(빈 이력·실패)의 안정 계약을
 * 고정한다. 격자·요약 파생의 값 판정은 upload-grass 단위 테스트가 촘촘히 덮는다.
 * 이력 픽스처는 실행일 기준 상대 날짜다 — RecordTabBody가 todayKstDate()를 쓰므로
 * 고정 날짜 픽스처는 창 밖으로 밀려난다.
 */

const DAY_MS = 86_400_000;

/** KST 날짜 라벨 ± n일 — 문자열 산술(테스트 TZ 무관) */
const shiftDate = (date: string, days: number): string => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
};

const TODAY = todayKstDate();

/** 오늘 3건 + 어제 1건 — 2일 업로드·최장 연속 2일·하루 최다 3개 */
const TWO_DAY_HISTORY = [
  { uploadDate: TODAY, uploadCount: 3 },
  { uploadDate: shiftDate(TODAY, -1), uploadCount: 1 },
];

describe("기록 탭(업로드 잔디) 스모크", () => {
  beforeEach(() => {
    resetDexStores();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("/dex/history 진입 시 탭 pill이 3개(지도·뱃지·기록)이고 기록이 활성이며 본문이 렌더된다 (AC 2·7)", async () => {
    stubDexFetch({ uploadHistory: TWO_DAY_HISTORY });
    renderDexPanel("/dex/history");

    expect(
      await screen.findByRole("heading", { name: "업로드 기록" }),
    ).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "지도",
      "뱃지",
      "기록",
    ]);
    expect(
      screen.getByRole("tab", { name: "기록" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("button", { name: /전체 보기/ })).toBeTruthy();
  });

  it("지도 탭에서 기록 pill을 클릭하면 기록 탭 본문으로 전환된다 (AC 2)", async () => {
    stubDexFetch({ uploadHistory: TWO_DAY_HISTORY });
    renderDexPanel("/dex");
    await screen.findByRole("tab", { name: "기록" });

    fireEvent.click(screen.getByRole("tab", { name: "기록" }));

    expect(
      await screen.findByRole("heading", { name: "업로드 기록" }),
    ).toBeTruthy();
  });

  it("메타 라인은 실데이터 파생이다 — 오늘·어제 업로드면 '2일 업로드 · 최장 연속 2일' (AC 7)", async () => {
    stubDexFetch({ uploadHistory: TWO_DAY_HISTORY });
    renderDexPanel("/dex/history");

    expect(
      await screen.findByText("최근 24주 · 2일 업로드 · 최장 연속 2일"),
    ).toBeTruthy();
  });

  it("이력 0건이면 '0일 업로드' 메타와 잔디 카드가 렌더된다 — 별도 빈 상태 화면 없음 (AC 10, A7)", async () => {
    stubDexFetch(); // uploadHistory 기본값 = 빈 이력
    renderDexPanel("/dex/history");

    expect(
      await screen.findByText("최근 24주 · 0일 업로드 · 최장 연속 0일"),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "업로드 기록" })).toBeTruthy();
  });

  it("'전체 보기' 클릭 시 1년 모달이 열리고(53주 창 헤드라인·'최근 1년' 라벨) ✕로 닫힌다 (AC 9)", async () => {
    stubDexFetch({ uploadHistory: TWO_DAY_HISTORY });
    renderDexPanel("/dex/history");
    await screen.findByRole("heading", { name: "업로드 기록" });

    fireEvent.click(screen.getByRole("button", { name: /전체 보기/ }));

    expect(
      await screen.findByText("지난 1년 동안 2일 업로드했어요"),
    ).toBeTruthy();
    expect(screen.getByText("최근 1년")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByText("지난 1년 동안 2일 업로드했어요")).toBeNull();
  });

  it("이력 조회 실패 시 안내와 재시도 버튼이 뜬다 — 기록 탭만 막는다 (AC 10)", async () => {
    stubDexFetch({ failPath: "upload-history" });
    renderDexPanel("/dex/history");

    expect(
      await screen.findByText("업로드 기록을 불러오지 못했어요"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
  });

  // 검증 단계 추가(page-verifier) — AC 10의 "재시도 클릭 시 재조회"를 직접 고정한다:
  // 실패 상태에서 스텁을 정상 응답으로 갈아끼우고 클릭하면 refetch가 본문을 되살린다
  it("재시도 클릭 시 재조회되어 실패가 본문으로 회복된다 (AC 10)", async () => {
    stubDexFetch({ failPath: "upload-history" });
    renderDexPanel("/dex/history");
    await screen.findByText("업로드 기록을 불러오지 못했어요");

    stubDexFetch({ uploadHistory: TWO_DAY_HISTORY });
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(
      await screen.findByText("최근 24주 · 2일 업로드 · 최장 연속 2일"),
    ).toBeTruthy();
    expect(screen.queryByText("업로드 기록을 불러오지 못했어요")).toBeNull();
  });
});

// codex 리뷰 P2 반영 — "오늘"이 마운트 시 1회 고정이면 KST 자정을 넘긴 뒤 도착한
// 새 날짜 이력이 미래로 걸러져 잔디·통계가 스테일. 데이터 도착(=렌더)마다 "오늘"을
// 재파생해야 한다. RecordTabBody 직접 렌더(컴포넌트 스모크) — Date만 페이크.
describe("기록 탭 KST 자정 경과 (codex P2)", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("자정 경과 후 데이터 갱신이 오면 새 날짜 이력이 미래로 걸러지지 않는다", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // KST 2026-03-11 23:00 (UTC+9)
    vi.setSystemTime(new Date("2026-03-11T14:00:00Z"));
    const dayD = todayKstDate();
    expect(dayD).toBe("2026-03-11");

    const { rerender } = render(
      <RecordTabBody history={[{ uploadDate: dayD, uploadCount: 1 }]} />,
    );
    expect(
      screen.getByText("최근 24주 · 1일 업로드 · 최장 연속 1일"),
    ).toBeTruthy();

    // KST 자정 경과 → 2026-03-12, 새 날짜 업로드가 담긴 갱신 데이터 도착
    vi.setSystemTime(new Date("2026-03-11T16:00:00Z"));
    rerender(
      <RecordTabBody
        history={[
          { uploadDate: dayD, uploadCount: 1 },
          { uploadDate: "2026-03-12", uploadCount: 2 },
        ]}
      />,
    );

    expect(
      screen.getByText("최근 24주 · 2일 업로드 · 최장 연속 2일"),
    ).toBeTruthy();
  });
});
