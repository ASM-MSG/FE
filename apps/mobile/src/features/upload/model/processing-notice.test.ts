import { describe, expect, it } from "vitest";
import {
  PROCESSING_NOTICE_COPY,
  dismissProcessingNotice,
  pushProcessingNotice,
  resolveNoticeAction,
  type ProcessingNotice,
} from "./processing-notice";

const notice = (
  kind: ProcessingNotice["kind"],
  videoId: number,
): ProcessingNotice => ({ kind, videoId });

describe("processing-notice — 통지 목록 연산 (기준 11)", () => {
  it("통지를 뒤에 쌓는다", () => {
    expect(
      pushProcessingNotice([notice("ready", 1)], notice("failed", 2)),
    ).toEqual([notice("ready", 1), notice("failed", 2)]);
  });

  it("같은 영상의 통지는 덮어쓴다 — 한 영상에 두 통지가 겹치지 않는다", () => {
    expect(
      pushProcessingNotice(
        [notice("ready", 1), notice("delayed", 2)],
        notice("failed", 1),
      ),
    ).toEqual([notice("delayed", 2), notice("failed", 1)]);
  });

  it("닫기는 해당 영상의 통지만 걷어낸다", () => {
    expect(
      dismissProcessingNotice([notice("ready", 1), notice("failed", 2)], 1),
    ).toEqual([notice("failed", 2)]);
  });
});

describe("resolveNoticeAction — 주 행동 목적지 (기준 11)", () => {
  it("완료 통지는 블러 확인 화면으로 videoId를 달고 간다", () => {
    expect(resolveNoticeAction(notice("ready", 42))).toEqual({
      route: "/upload/blur?videoId=42",
    });
  });

  it("실패 통지는 새 업로드 흐름으로 보낸다", () => {
    expect(resolveNoticeAction(notice("failed", 42))).toEqual({
      route: "/upload",
    });
  });

  it("지연 통지에는 주 행동이 없다 — 눌러도 갈 곳이 없는 버튼을 만들지 않는다", () => {
    expect(resolveNoticeAction(notice("delayed", 42))).toBeNull();
  });
});

describe("PROCESSING_NOTICE_COPY — 문구 (기준 12)", () => {
  it("세 종류 모두 제목·설명을 갖고, 행동 라벨은 지연만 없다", () => {
    expect(PROCESSING_NOTICE_COPY.ready.actionText).not.toBeNull();
    expect(PROCESSING_NOTICE_COPY.failed.actionText).not.toBeNull();
    expect(PROCESSING_NOTICE_COPY.delayed.actionText).toBeNull();
    for (const kind of ["ready", "failed", "delayed"] as const) {
      expect(PROCESSING_NOTICE_COPY[kind].title.length).toBeGreaterThan(0);
      expect(PROCESSING_NOTICE_COPY[kind].description.length).toBeGreaterThan(
        0,
      );
    }
  });

  it("실패 문구는 영상이 비공개로 남는다는 사실을 알린다 (티켓 동작 요구 8)", () => {
    expect(PROCESSING_NOTICE_COPY.failed.description).toContain("비공개");
  });
});
