import { describe, expect, it, vi } from "vitest";
import { buildGridVideoRows, combineGridVideoStatus } from "./grid-videos";

/**
 * 템플릿 ① 순수 로직 — "이 격자의 영상" 목록 병합·소유 판정·행 문구 (MSG-431 L13~L15).
 * 소유 판정(mine)이 시트 분기(공개 범위·삭제 vs 신고)의 유일한 근거라 값 단정이 촘촘하다.
 */

const NOW = new Date("2026-08-19T12:00:00+09:00");

const globalVideo = (
  videoId: number,
  nickname: string,
  viewCount = 214,
): {
  videoId: number;
  thumbnailUrl: string;
  durationSec: number;
  viewCount: number;
  recordedAt: string;
  nickname: string;
} => ({
  videoId,
  thumbnailUrl: `https://cdn.test/${videoId}.jpg`,
  durationSec: 24,
  viewCount,
  recordedAt: "2026-08-16T12:00:00+09:00",
  nickname,
});

const myVideo = (videoId: number) => ({
  videoId,
  thumbnailUrl: `https://cdn.test/my-${videoId}.jpg`,
  processingStatus: "READY",
  durationSec: 18,
  createdAt: "2026-08-18T12:00:00+09:00",
});

describe("buildGridVideoRows — 격자 영상 목록 병합 (L13)", () => {
  it("내 영상이 앞에 오고 전역 목록의 같은 videoId는 중복 제거된다 (L13)", () => {
    const rows = buildGridVideoRows(
      [globalVideo(11, "부산러버"), globalVideo(22, "필맵퍼")],
      [myVideo(22)],
      NOW,
    );

    expect(rows.map((row) => row.videoId)).toEqual([22, 11]);
  });

  it("내 영상 목록이 미도착(undefined)이면 전역 목록만으로 구성된다 (L13 — 경계)", () => {
    const rows = buildGridVideoRows(
      [globalVideo(11, "부산러버")],
      undefined,
      NOW,
    );

    expect(rows.map((row) => row.videoId)).toEqual([11]);
  });

  it("두 목록이 모두 비면 빈 목록이다 (L13 — 경계)", () => {
    expect(buildGridVideoRows([], [], NOW)).toEqual([]);
  });
});

describe("buildGridVideoRows — 소유 판정 (L14)", () => {
  it("내 영상 목록에 있는 videoId만 mine=true다 — 닉네임 문자열 비교가 아니다 (L14)", () => {
    const rows = buildGridVideoRows(
      [globalVideo(11, "부산러버"), globalVideo(22, "필맵퍼")],
      [myVideo(22)],
      NOW,
    );

    expect(
      Object.fromEntries(rows.map((row) => [row.videoId, row.mine])),
    ).toEqual({ 22: true, 11: false });
  });

  it("전역 목록에 없는 내 영상(비공개·처리 중)도 목록에 남아 관리할 수 있다 (L14)", () => {
    const rows = buildGridVideoRows(
      [globalVideo(11, "부산러버")],
      [myVideo(33)],
      NOW,
    );

    expect(rows.map((row) => [row.videoId, row.mine])).toEqual([
      [33, true],
      [11, false],
    ]);
  });
});

describe("buildGridVideoRows — 행 표시 문구 (L15)", () => {
  it('타인 영상 행은 "@닉네임" + "조회 214 · 3일 전"이다 (L15)', () => {
    const [row] = buildGridVideoRows([globalVideo(11, "부산러버")], [], NOW);

    expect(row.title).toBe("@부산러버");
    expect(row.meta).toBe("조회 214 · 3일 전");
  });

  it('내 영상 행은 "내 영상" + 조회수 없이 상대시간만이다 — my-videos에 조회수가 없다 (L15)', () => {
    const [row] = buildGridVideoRows([], [myVideo(33)], NOW);

    expect(row.title).toBe("내 영상");
    expect(row.meta).toBe("1일 전");
  });

  it("조회수는 축약 표기를 따른다 (L15 — 경계)", () => {
    const [row] = buildGridVideoRows(
      [globalVideo(11, "부산러버", 1400)],
      [],
      NOW,
    );

    expect(row.meta).toBe("조회 1.4K · 3일 전");
  });
});

describe("combineGridVideoStatus — 두 목록 쿼리 상태 합성 (L13 · codex 리뷰 3)", () => {
  const status = (over: Partial<{ isPending: boolean; isError: boolean }>) => ({
    isPending: false,
    isError: false,
    retry: vi.fn(),
    ...over,
  });

  /** 재시도 1회로 각 쿼리가 몇 번 불렸는가 — 실패 조합만 바꿔 같은 단정을 돌린다 */
  const retryCounts = (
    globalOver: Partial<{ isPending: boolean; isError: boolean }>,
    mineOver: Partial<{ isPending: boolean; isError: boolean }>,
  ): [number, number] => {
    const globalStatus = status(globalOver);
    const mineStatus = status(mineOver);
    combineGridVideoStatus(globalStatus, mineStatus).retry();
    return [
      globalStatus.retry.mock.calls.length,
      mineStatus.retry.mock.calls.length,
    ];
  };

  it("둘 다 실패한 상태에서 재시도하면 두 쿼리를 모두 다시 부른다 (L13)", () => {
    expect(retryCounts({ isError: true }, { isError: true })).toEqual([1, 1]);
  });

  it("한쪽만 실패해도 재시도는 두 쿼리를 모두 부른다 — 웹 정본과 동일 (L13)", () => {
    expect(retryCounts({}, { isError: true })).toEqual([1, 1]);
    expect(retryCounts({ isError: true }, {})).toEqual([1, 1]);
  });

  it("한쪽만 pending·error여도 목록 전체가 그 상태다 (L13)", () => {
    expect(
      combineGridVideoStatus(status({ isPending: true }), status({})),
    ).toMatchObject({ isPending: true, isError: false });
    expect(
      combineGridVideoStatus(status({}), status({ isError: true })),
    ).toMatchObject({ isPending: false, isError: true });
  });
});
