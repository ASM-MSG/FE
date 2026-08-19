import { describe, expect, it } from "vitest";
import { resolvePickOutcome } from "./pick-result";

/**
 * MSG-302 AC 8 — 권한·picker 결과를 denied | canceled | picked로 판정하는 순수 함수.
 * MSG-424 확장: presign(`extension`·`contentType`·`contentLength`)과 사전 검증에 필요한
 * 파일 메타(fileName·fileSize·mimeType)를 함께 캡처한다.
 */
describe("resolvePickOutcome (MSG-302 AC 8)", () => {
  it("권한 거부 시 denied — 안내 표시 대상, 다음 단계 이동 없음", () => {
    expect(resolvePickOutcome(false, null)).toEqual({ kind: "denied" });
  });

  it("선택 취소 시 canceled — 아무 동작 없음", () => {
    expect(resolvePickOutcome(true, { canceled: true, assets: null })).toEqual({
      kind: "canceled",
    });
  });

  it("영상 확보 시 picked — uri와 durationSec(ms→초 반올림)을 담는다", () => {
    expect(
      resolvePickOutcome(true, {
        canceled: false,
        assets: [
          {
            uri: "file:///pick.mov",
            duration: 41_600,
            fileName: "pick.mov",
            fileSize: 2048,
            mimeType: "video/quicktime",
          },
        ],
      }),
    ).toEqual({
      kind: "picked",
      video: {
        uri: "file:///pick.mov",
        durationSec: 42,
        fileName: "pick.mov",
        fileSize: 2048,
        mimeType: "video/quicktime",
      },
    });
  });

  it("duration이 없는 자산은 durationSec null로 확보된다 — 304 길이 뱃지 폴백 대상", () => {
    const outcome = resolvePickOutcome(true, {
      canceled: false,
      assets: [{ uri: "file:///pick.mp4", duration: null }],
    });

    // 5필드 정확 형상으로 단정한다 — 부분 단정은 메타 누락을 놓친다(검증 지적 8)
    expect(outcome).toEqual({
      kind: "picked",
      video: {
        uri: "file:///pick.mp4",
        durationSec: null,
        fileName: "pick.mp4",
        fileSize: null,
        mimeType: null,
      },
    });
  });

  it("picker가 파일명을 안 주면 uri 마지막 조각을 쓴다 — presign 확장자 판정의 재료 (MSG-424)", () => {
    const outcome = resolvePickOutcome(true, {
      canceled: false,
      assets: [{ uri: "file:///var/mobile/clip.mp4", duration: 5_000 }],
    });

    expect(outcome).toMatchObject({
      kind: "picked",
      video: { fileName: "clip.mp4", fileSize: null, mimeType: null },
    });
  });

  it("파일명에 확장자가 없으면 MIME에서 파생해 붙인다 — 안드로이드 content:// 오검출 방지 (MSG-424)", () => {
    const quicktime = resolvePickOutcome(true, {
      canceled: false,
      assets: [
        {
          uri: "content://media/external/video/media/42",
          duration: 5_000,
          mimeType: "video/quicktime",
        },
      ],
    });
    const unknown = resolvePickOutcome(true, {
      canceled: false,
      assets: [{ uri: "content://media/external/video/media/42", duration: 1 }],
    });

    expect(quicktime).toMatchObject({ video: { fileName: "42.mov" } });
    expect(unknown).toMatchObject({ video: { fileName: "42.mp4" } });
  });

  it("확장자가 있는 파일명은 그대로 보존한다 — 허용 목록 검증이 무력화되지 않는다 (MSG-424)", () => {
    const outcome = resolvePickOutcome(true, {
      canceled: false,
      assets: [
        {
          uri: "file:///pick.avi",
          duration: 5_000,
          fileName: "pick.avi",
          mimeType: "video/x-msvideo",
        },
      ],
    });

    expect(outcome).toMatchObject({ video: { fileName: "pick.avi" } });
  });
});
