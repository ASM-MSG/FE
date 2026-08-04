import { describe, expect, it } from "vitest";
import { cellBoundsAt, cellIndexAt } from "../../../entities/cell/model/grid";
import { cellIdFor } from "../../../entities/cell/model/cell-id";
import { MOCK_CELL_DETAILS } from "./mock-cell-details";
import { deriveCellDetail } from "./cell-detail";

/** mock isoAgo는 모듈 로드 시점 기준 — 실행 시점 now 주입으로 상대시간 단정을 안정화 */
const NOW = new Date();

const mockById = (id: string) => {
  const found = MOCK_CELL_DETAILS.find((cell) => cell.id === id);
  if (!found) throw new Error(`mock 없음: ${id}`);
  return found;
};

/** mock 셀의 center 좌표 탭을 재현 — 탭 좌표→셀 인덱스→셀 id (AC 1) */
const tapIdFor = (id: string) => cellIdFor(cellIndexAt(mockById(id).center));

describe("deriveCellDetail — 등록 셀 (AC 1·4·5·7·9)", () => {
  it("셀 center 좌표 탭의 인코딩 id가 등록 mock 셀 상세로 매핑된다 (AC 1)", () => {
    const detail = deriveCellDetail(tapIdFor("seomyeon-a-14"), NOW);
    expect(detail?.label).toBe("서면 A-14");
  });

  it('격자명·위치·"최근 업로드 5분 전" 문구가 파생된다 (AC 5)', () => {
    const detail = deriveCellDetail(tapIdFor("seomyeon-a-14"), NOW);
    expect(detail?.label).toBe("서면 A-14");
    expect(detail?.location).toBe("부산 부산진구 서면");
    expect(detail?.recentUploadText).toBe("최근 업로드 5분 전");
  });

  it('통계 3종 문자열 — 담수율 "73%"·영상 "138개"·조회 "1.4K" (AC 7)', () => {
    const detail = deriveCellDetail(tapIdFor("seomyeon-a-14"), NOW);
    expect(detail?.stats).toEqual({
      fillRate: "73%",
      videoCount: "138개",
      viewCount: "1.4K",
    });
  });

  it("대표 영상(목록 첫 영상) 길이의 mm:ss 뱃지 라벨이 파생된다 (AC 4)", () => {
    const detail = deriveCellDetail(tapIdFor("seomyeon-a-14"), NOW);
    expect(detail?.previewDurationLabel).toBe("0:12");
    expect(detail?.isEmpty).toBe(false);
  });

  it('영상 목록 메타 "조회 {축약} · {상대시간}" — 축약·상대시간 포맷 적용 (AC 9)', () => {
    const detail = deriveCellDetail(tapIdFor("seomyeon-a-14"), NOW);
    expect(detail?.videos[0]?.meta).toBe("조회 214 · 5분 전");
    expect(detail?.videos[1]?.meta).toBe("조회 1.4K · 3시간 전");
  });

  it("카메라 중심은 소속 셀 bounds의 중점이다 (AC 2 로직부)", () => {
    const cellId = tapIdFor("seomyeon-a-14");
    const detail = deriveCellDetail(cellId, NOW);
    const bounds = cellBoundsAt(cellIndexAt(mockById("seomyeon-a-14").center));
    expect(detail?.center.lat).toBeCloseTo(
      (bounds.sw.lat + bounds.ne.lat) / 2,
      12,
    );
    expect(detail?.center.lng).toBeCloseTo(
      (bounds.sw.lng + bounds.ne.lng) / 2,
      12,
    );
  });
});

describe("deriveCellDetail — 빈 상태·미등록 셀 (AC 10, 질문 2-a)", () => {
  it("영상 0개 등록 셀은 빈 판정 — 미리보기 null·목록 빈 배열·최근 업로드 없음 (AC 10)", () => {
    const detail = deriveCellDetail(tapIdFor("beomcheon-i-01"), NOW);
    expect(detail?.label).toBe("범천 I-01");
    expect(detail?.isEmpty).toBe(true);
    expect(detail?.previewDurationLabel).toBeNull();
    expect(detail?.videos).toEqual([]);
    expect(detail?.recentUploadText).toBeNull();
  });

  it("미등록 셀은 인덱스 자동 라벨 + 고정 위치 + 빈 상태로 진입한다 (질문 2-a)", () => {
    const index = cellIndexAt({ lat: 35.2, lng: 129.0 }); // mock 셀과 무관한 좌표
    const detail = deriveCellDetail(cellIdFor(index), NOW);
    expect(detail?.label).toBe(`서면 격자 ${index.col}-${index.row}`);
    expect(detail?.location).toBe("부산 부산진구");
    expect(detail?.isEmpty).toBe(true);
    expect(detail?.stats).toEqual({
      fillRate: "0%",
      videoCount: "0개",
      viewCount: "0",
    });
  });

  it("인코딩 형식이 아닌 id는 null (지도 탭 외 진입 경로 없음)", () => {
    expect(deriveCellDetail("seomyeon-a-14", NOW)).toBeNull();
  });
});

describe("mock 데이터 감사 (AC 11 — 부산 서면 기준)", () => {
  it("mock 소스에 서울 지명(서울·홍대·마포)이 없다", () => {
    expect(JSON.stringify(MOCK_CELL_DETAILS)).not.toMatch(/서울|홍대|마포/);
  });

  it("등록 셀 id가 홈 mock-grid-videos 격자 id와 정합한다", async () => {
    const { MOCK_GRID_VIDEOS } =
      await import("../../map-home/model/mock-grid-videos");
    const homeIds = new Set(MOCK_GRID_VIDEOS.map((video) => video.id));
    for (const cell of MOCK_CELL_DETAILS) {
      expect(homeIds.has(cell.id)).toBe(true);
    }
  });
});
