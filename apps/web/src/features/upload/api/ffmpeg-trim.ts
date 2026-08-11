import type { FFmpeg } from "@ffmpeg/ffmpeg";
import type { Segment } from "../model/highlight-selection";
import { needsEndpointRecut, recutSegment } from "../model/video-trim";

/**
 * ffmpeg.wasm 트리밍 어댑터 (MSG-329 B8, 티켓 확정 — FE 스트림 카피).
 * - 지연 로드: dynamic import + 코어 에셋 `?url` 번들 참조(자체 서빙 — 외부 CDN 미사용).
 *   최초 트리밍 시점에만 수십 MB 코어를 내려받는다 (리스크 5 — 로딩 표시로 흡수).
 * - 단일 스레드 코어(@ffmpeg/core) — SharedArrayBuffer/COOP·COEP 불요.
 * - `-ss {start} -i in -t {length} -c copy`: 재인코딩 없는 스트림 카피. 키프레임 경계에서
 *   시작해 실측이 선택보다 길 수 있고, 실측 >30초면 끝점 보정(순수 함수) 재컷 1회.
 * - wasm은 vitest(jsdom)에서 실행 불가 — 이 어댑터는 인터페이스 뒤에 두고 보정 계산
 *   (model/video-trim)만 단위 테스트한다 (스펙 검증 방법).
 */

export interface TrimResult {
  /** 잘린 영상 (mp4 컨테이너) */
  blob: Blob;
  /** 잘린 영상 실측 길이(초) — POST /api/videos durationSec의 정본 */
  durationSec: number;
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

/** ffmpeg 인스턴스 싱글턴 — 최초 호출에서만 모듈·코어를 내려받는다 */
const getFFmpeg = (): Promise<FFmpeg> => {
  ffmpegPromise ??= (async () => {
    const [{ FFmpeg: FFmpegCtor }, coreModule, wasmModule] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/core?url"),
      import("@ffmpeg/core/wasm?url"),
    ]);
    const ffmpeg = new FFmpegCtor();
    await ffmpeg.load({
      coreURL: coreModule.default,
      wasmURL: wasmModule.default,
    });
    return ffmpeg;
  })();
  return ffmpegPromise;
};

/** Blob 실측 길이(초) — 메타데이터 프로브. 측정 불가(코덱 미지원 등)면 reject */
export const measureBlobDuration = async (blob: Blob): Promise<number> => {
  const probe = document.createElement("video");
  const url = URL.createObjectURL(blob);
  // revoke는 try/catch 뒤 직선 코드로 — 성공·실패 모두 지나는 자리라 누수가 없고,
  // 정적 분석(react-doctor)이 finally·핸들러 내 revoke는 인정하지 않는다
  let duration: number | null;
  try {
    duration = await new Promise<number>((resolve, reject) => {
      probe.preload = "metadata";
      probe.addEventListener("loadedmetadata", () => {
        resolve(probe.duration);
      });
      probe.addEventListener("error", () => {
        reject(new Error("측정 실패"));
      });
      probe.src = url;
    });
  } catch {
    duration = null;
  }
  probe.src = "";
  URL.revokeObjectURL(url);
  if (duration === null) {
    throw new Error("잘린 영상의 길이를 측정하지 못했어요");
  }
  return duration;
};

const INPUT_NAME = "trim-input";
const OUTPUT_NAME = "trim-output.mp4";

/**
 * 선택 구간으로 스트림 카피 트리밍 (B8).
 * 실측 >30초면 끝점 보정(recutSegment) 재컷 1회로 최종 실측 ≤30초를 보장한다.
 */
export const trimToSegment = async (
  file: File,
  segment: Segment,
): Promise<TrimResult> => {
  const ffmpeg = await getFFmpeg();
  await ffmpeg.writeFile(INPUT_NAME, new Uint8Array(await file.arrayBuffer()));

  const cutOnce = async (target: Segment): Promise<Blob> => {
    await ffmpeg.exec([
      "-ss",
      String(target.start),
      "-i",
      INPUT_NAME,
      "-t",
      String(target.end - target.start),
      "-c",
      "copy",
      "-y",
      OUTPUT_NAME,
    ]);
    const data = await ffmpeg.readFile(OUTPUT_NAME);
    if (typeof data === "string") {
      throw new Error("트리밍 결과를 읽지 못했어요");
    }
    // wasm 힙 뷰를 분리 복사해 Blob으로 — 이후 파일 삭제와 무관하게 유효
    return new Blob([new Uint8Array(data)], { type: "video/mp4" });
  };

  try {
    let blob = await cutOnce(segment);
    let durationSec = await measureBlobDuration(blob);
    if (needsEndpointRecut(durationSec)) {
      blob = await cutOnce(recutSegment(segment, durationSec));
      durationSec = await measureBlobDuration(blob);
    }
    return { blob, durationSec };
  } finally {
    // 입력·출력 파일 정리 — 다음 트리밍의 잔존물 방지 (실패해도 치명적이지 않다)
    await ffmpeg.deleteFile(INPUT_NAME).catch(() => {});
    await ffmpeg.deleteFile(OUTPUT_NAME).catch(() => {});
  }
};
