import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/api-error";
import {
  playbackAccessNotice,
  playbackOwnerLine,
  playbackTitle,
} from "./video-playback";

const NOW = new Date("2026-08-21T12:00:00+09:00");

describe("playbackTitle — 재생 화면 제목 폴백 (기준 3)", () => {
  it("구역 안 격자는 구역명과 위치 코드를 붙여 제목으로 쓴다", () => {
    const title = playbackTitle({
      zoneName: "서면",
      zoneCell: "A-14",
      regionName: "부전동",
    });

    expect(title).toBe("서면 A-14");
  });

  it("구역 밖 격자는 행정동 이름으로 폴백한다", () => {
    const title = playbackTitle({
      zoneName: null,
      zoneCell: null,
      regionName: "부전동",
    });

    expect(title).toBe("부전동");
  });

  it("구역도 행정동도 없으면 '영상'으로 폴백한다 (경계)", () => {
    const title = playbackTitle({
      zoneName: null,
      zoneCell: null,
      regionName: null,
    });

    expect(title).toBe("영상");
  });
});

describe("playbackOwnerLine — 업로더·업로드 시점 한 줄 (기준 4)", () => {
  it("내 영상은 '내 영상 · M월 D일'로 낸다", () => {
    const line = playbackOwnerLine(
      { nickname: "규호", recordedAt: "2026-08-11T09:30:00+09:00" },
      true,
      NOW,
    );

    expect(line).toBe("내 영상 · 8월 11일");
  });

  it("타인 영상은 '@닉네임 · 상대시간'으로 낸다 — @는 FE가 붙인다", () => {
    const line = playbackOwnerLine(
      { nickname: "규호", recordedAt: "2026-08-21T09:00:00+09:00" },
      false,
      NOW,
    );

    expect(line).toBe("@규호 · 3시간 전");
  });
});

describe("playbackAccessNotice — 재생 실패 사유·재시도 노출 판정 (기준 5)", () => {
  it("403은 비공개 차단 문구를 내고 재시도를 노출하지 않는다", () => {
    const notice = playbackAccessNotice(
      new ApiError("Forbidden", { status: 403 }),
    );

    expect(notice).toEqual({
      message: "비공개로 설정된 영상이라 볼 수 없어요",
      retryable: false,
    });
  });

  it("404는 삭제·블라인드 문구를 내고 재시도를 노출하지 않는다", () => {
    const notice = playbackAccessNotice(
      new ApiError("Not Found", { status: 404 }),
    );

    expect(notice).toEqual({
      message: "삭제되었거나 볼 수 없는 영상이에요",
      retryable: false,
    });
  });

  it("네트워크 실패(status 없음)는 일시 실패로 보고 재시도를 노출한다", () => {
    const notice = playbackAccessNotice(new ApiError("네트워크 오류"));

    expect(notice).toEqual({
      message: "영상을 불러오지 못했어요",
      retryable: true,
    });
  });

  it("5xx는 일시 실패로 보고 재시도를 노출한다", () => {
    const notice = playbackAccessNotice(
      new ApiError("Server Error", { status: 500 }),
    );

    expect(notice.retryable).toBe(true);
  });

  it("401 등 다른 4xx는 재시도를 노출하지 않는다 (경계 — 눌러도 같은 결과다)", () => {
    const notice = playbackAccessNotice(
      new ApiError("Unauthorized", { status: 401 }),
    );

    expect(notice.retryable).toBe(false);
  });

  it("정규화를 거치지 않은 예외도 일시 실패로 안내한다 (경계)", () => {
    const notice = playbackAccessNotice(new Error("boom"));

    expect(notice).toEqual({
      message: "영상을 불러오지 못했어요",
      retryable: true,
    });
  });
});
