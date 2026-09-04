import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_PROFILE_IMAGE_BYTES } from "./profile-image";
import { measureFileSize, toProfileImageCandidate } from "./profile-image-pick";

/**
 * 템플릿 ① 순수 로직 — 픽커 자산 → 업로드 후보 변환 (MSG-564 기준 2, 결정 D3).
 * 웹은 `<input accept>`가 형식을 걸러 주지만 앱 픽커에는 MIME 필터가 없어 heic 등이 그대로
 * 온다 — 형식·크기 검증을 요청 전에 여기서 끝낸다.
 */
const FORMAT_MESSAGE = "jpg·jpeg·png·webp 형식의 이미지만 올릴 수 있어요";
const SIZE_MESSAGE = "5MB 이하의 이미지만 올릴 수 있어요";

describe("toProfileImageCandidate — 픽커 자산 → 업로드 후보 (기준 2)", () => {
  it("fileName·MIME·크기가 모두 유효하면 후보를 만든다 (기준 2)", () => {
    expect(
      toProfileImageCandidate({
        uri: "file:///cache/photo.jpg",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
      }),
    ).toEqual({
      kind: "ok",
      uri: "file:///cache/photo.jpg",
      candidate: { name: "photo.jpg", type: "image/jpeg", size: 1024 },
    });
  });

  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ])(
    "fileName이 없으면 MIME %s에서 확장자 %s를 파생한다 (기준 2)",
    (mimeType, extension) => {
      const pick = toProfileImageCandidate({
        uri: "content://media/external/images/1234",
        fileName: null,
        mimeType,
        fileSize: 1024,
      });

      expect(pick).toMatchObject({
        kind: "ok",
        candidate: { name: `1234.${extension}`, type: mimeType },
      });
    },
  );

  it("fileName 확장자가 MIME과 다르면 확장자를 MIME에서 다시 파생한다 — 트랜스코딩된 HEIC (codex 리뷰)", () => {
    expect(
      toProfileImageCandidate({
        uri: "content://media/external/images/77",
        fileName: "photo.heic",
        mimeType: "image/jpeg",
        fileSize: 1024,
      }),
    ).toMatchObject({
      kind: "ok",
      candidate: { name: "photo.jpg", type: "image/jpeg" },
    });
  });

  it.each<[string | null, string]>([
    ["image/heic", "허용 외 MIME"],
    [null, "MIME 없음"],
  ])("MIME이 %s(%s)이면 형식 문구로 거부한다 (기준 2)", (mimeType) => {
    expect(
      toProfileImageCandidate({
        uri: "file:///cache/photo.heic",
        fileName: "photo.heic",
        mimeType,
        fileSize: 1024,
      }),
    ).toEqual({ kind: "rejected", message: FORMAT_MESSAGE });
  });

  it("5MB를 넘으면 크기 문구로 거부하고 경계 5MB는 허용한다 (기준 2)", () => {
    const base = {
      uri: "file:///cache/big.png",
      fileName: "big.png",
      mimeType: "image/png",
    };

    expect(
      toProfileImageCandidate({
        ...base,
        fileSize: MAX_PROFILE_IMAGE_BYTES + 1,
      }),
    ).toEqual({ kind: "rejected", message: SIZE_MESSAGE });
    expect(
      toProfileImageCandidate({ ...base, fileSize: MAX_PROFILE_IMAGE_BYTES }),
    ).toMatchObject({ kind: "ok" });
  });
});

describe("measureFileSize — fileSize 누락 시 실측 (스펙 Q2)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ok 응답의 바이트 길이를 돌려주고, 실패 응답은 크기로 오판하지 않고 거부한다", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(3),
    }));
    await expect(measureFileSize("content://photo")).resolves.toBe(3);

    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 404,
      arrayBuffer: async () => new ArrayBuffer(99),
    }));
    await expect(measureFileSize("content://gone")).rejects.toThrow("HTTP 404");
  });
});
