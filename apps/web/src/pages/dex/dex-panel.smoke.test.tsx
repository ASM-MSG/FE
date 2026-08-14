import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { GRID_SEOMYEON, stubDexFetch } from "./dex-fetch-stub";
import { renderDexPanel, resetDexStores } from "./dex-test-harness";

/**
 * 도감 패널 스모크 (MSG-327 기준 1~3·6·8·9·16·22) — 실 API 스텁 위에서 패널의 안정 계약만
 * 고정한다: 요약 표시, 동 단위 목록, X 감춤, 지도 셀 클릭 배선, 오류·재시도.
 * 격자 그룹·NEW·미니 패널 재생은 gallery-tab.smoke, 뱃지 아트·정렬은 badge-tab.smoke의 몫이다.
 */

const moveToSpy = vi.fn();

const renderPanel = (path = "/dex") => renderDexPanel(path, moveToSpy);

describe("도감 패널 스모크", () => {
  beforeEach(() => {
    resetDexStores();
    moveToSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("헤더에 실 프로필 닉네임과 탐험 규모 문구가 표시된다 (기준 1·2)", async () => {
    stubDexFetch();
    renderPanel();

    expect(await screen.findByText("필맵퍼")).toBeTruthy();
    expect(screen.getByText("동네 3곳 · 격자 6개 탐험")).toBeTruthy();
  });

  it("통계 카드가 요약 응답값으로 표시된다 (기준 3)", async () => {
    stubDexFetch();
    renderPanel();

    // 수집 격자 6개 · 획득 뱃지 4개 · 연속 스트릭 12일
    expect(await screen.findByText("6개")).toBeTruthy();
    expect(screen.getByText("4개")).toBeTruthy();
    expect(screen.getByText("12일")).toBeTruthy();
  });

  it("현재 위치 행정동의 수집률이 진행 바로 표시된다 (기준 4)", async () => {
    stubDexFetch();
    renderPanel();

    const bar = await screen.findByRole("progressbar", {
      name: "부전제1동 탐험률",
    });
    expect(bar.getAttribute("aria-valuenow")).toBe("52");
  });

  it("최근 수집 목록이 동 단위로, 그 동의 영상 수 합계와 함께 표시된다 (기준 5·6)", async () => {
    stubDexFetch();
    renderPanel();

    expect(await screen.findByText("부전제1동")).toBeTruthy();
    expect(screen.getByText("전포동")).toBeTruthy();
    expect(screen.getByText(/영상 4개/)).toBeTruthy();
  });

  it("수집 0건이면 빈 상태 안내가 표시된다 (기준 9)", async () => {
    stubDexFetch({ grids: [] });
    renderPanel();

    expect(await screen.findByText(/아직 수집한 격자가 없어요/)).toBeTruthy();
  });

  it("X 버튼은 동별 접근 가능한 이름을 갖고, 클릭 시 그 동만 사라진다 (기준 8)", async () => {
    stubDexFetch();
    renderPanel();

    fireEvent.click(
      await screen.findByRole("button", { name: "부전제1동 목록에서 제거" }),
    );

    expect(screen.queryByText("부전제1동")).toBeNull();
    expect(screen.getByText("전포동")).toBeTruthy();
    // 통계 카드 불변 — 감춤은 수집 취소가 아니다
    expect(screen.getByText("6개")).toBeTruthy();
  });

  it("X로 전부 감춰도 '수집 0건' 빈 상태 안내는 나타나지 않는다 (기준 9와 구분)", async () => {
    stubDexFetch();
    renderPanel();

    fireEvent.click(
      await screen.findByRole("button", { name: "부전제1동 목록에서 제거" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "전포동 목록에서 제거" }),
    );

    expect(screen.queryByText(/아직 수집한 격자가 없어요/)).toBeNull();
    expect(screen.getByText("최근 수집한 격자")).toBeTruthy();
  });

  it("지도 탭에서 셀 클릭 핸들러를 등록하고, 그 격자가 속한 동의 갤러리로 진입한다 (기준 16)", async () => {
    stubDexFetch();
    const { unmount } = renderPanel();
    await screen.findByText("부전제1동");

    const onCellClick = useMapOverlayStore.getState().onCellClick;
    expect(onCellClick).not.toBeNull();

    onCellClick?.(GRID_SEOMYEON.gridId);

    await waitFor(() =>
      expect(useGalleryRegionStore.getState().selected).toEqual({
        regionName: "부전제1동",
        gridId: GRID_SEOMYEON.gridId,
      }),
    );

    unmount();
    expect(useMapOverlayStore.getState().onCellClick).toBeNull();
  });

  it("도감 조회 실패 시 오류 안내와 재시도 버튼이 렌더된다 (기준 22)", async () => {
    stubDexFetch({ failPath: "/api/collections/grids" });
    renderPanel();

    expect(await screen.findByText("도감을 불러오지 못했어요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
  });
});
