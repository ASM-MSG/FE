import {
  TRANSCODE_MAX_SIZE,
  TRANSCODE_TIMEOUT_MS,
  type TranscodeOutcome,
} from "../model/transcode-policy";
import type { UploadVideo } from "../model/upload-flow-store";

/**
 * 영상 변환 네이티브 격리 경계 (MSG-616 D4·D6·D7·D12) — `react-native-compressor`를 만지는
 * 유일한 지점.
 *
 * **정적 import를 쓰지 않는다 (kakao-adapter 선례, MSG-429 실기 환류).** nitro 모듈이 빠진
 * 구 dev client에서는 import 체인이 통째로 평가 실패해 앱이 렌더되지 않는다. 로드를 함수 안으로
 * 미뤄 "변환만 건너뛰고 원본으로 업로드"까지로 피해를 가둔다 — 그래서 구 dev client가 곧
 * AC 5(모듈 미탑재 fallback)의 재현 수단이다. vitest(node)도 같은 경로를 탄다.
 *
 * 계약: 성공하면 출력 메타를 담은 outcome, **모든 실패는 null**(reject·메타 누락·size 비유한·
 * 타임아웃·모듈 미탑재). 호출부(분석 화면)는 null이면 원본으로 기존 선분석을 그대로 진행하고
 * 사용자에게 실패 문구를 내지 않는다 — 서버가 기존 인코딩 경로로 처리하므로 결과는 같고 느릴 뿐.
 */
type CompressorModule = typeof import("react-native-compressor");

const devWarn = (reason: string, detail?: unknown) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(`[transcode] fallback: ${reason}`, detail ?? "");
  }
};

/**
 * 상한을 넘기면 네이티브 작업을 취소하고 reject — 뒤로가기 없는 화면에 갇히지 않게 (D4).
 * 압축만이 아니라 **출력 메타 조회까지 한 시퀀스**에 건다 — iOS 2.0.3 `getVideoMetaData`는 트랙
 * 없는 파일에서 영원히 pending이다(codex 리뷰).
 */
const withTimeout = <T>(
  work: Promise<T>,
  ms: number,
  onTimeout: () => void,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`timeout ${ms}ms`));
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/**
 * 원본 → 720p H.264/AAC MP4. `onProgress`는 네이티브 실진행(0~1) — 분석 화면 진행 바가 그대로 쓴다.
 *
 * 오디오·비트레이트는 라이브러리 기본값(iOS AAC 128k 재인코딩 / Android 패스스루, bitrate 추정식)에
 * 맡기고 `compressionMethod: "manual"`로 maxSize만 지정한다 — `auto`는 크기 정책을 라이브러리가
 * 정해 BE 게이트(height ≤720)를 보장하지 못한다.
 */
export const transcodeVideo = async (
  video: UploadVideo,
  onProgress: (progress: number) => void,
): Promise<TranscodeOutcome | null> => {
  let compressor: CompressorModule;
  try {
    compressor = await import("react-native-compressor");
  } catch (error) {
    devWarn("모듈 로드 실패 — 구 dev client?", error);
    return null;
  }

  const startedAt = Date.now();
  try {
    // 원본 메타는 조회하지 않는다 — 긴 변 720 고정이라 축 판정이 필요 없고, 회전 태그 영상에서
    // 오판하던 재료이기도 했다(transcode-policy TRANSCODE_MAX_SIZE 주석). Android rotation 메타
    // 누락 파일은 compress 자체가 reject해 같은 fallback으로 떨어진다(R5).
    let cancellationId: string | null = null;
    const { outputUri, output } = await withTimeout(
      (async () => {
        const outputUri = await compressor.Video.compress(
          video.uri,
          {
            compressionMethod: "manual",
            maxSize: TRANSCODE_MAX_SIZE,
            progressDivider: 5,
            getCancellationId: (id) => {
              cancellationId = id;
            },
          },
          onProgress,
        );
        return {
          outputUri,
          output: await compressor.getVideoMetaData(outputUri),
        };
      })(),
      TRANSCODE_TIMEOUT_MS,
      () => {
        if (cancellationId !== null) {
          compressor.Video.cancelCompression(cancellationId);
        }
      },
    );

    const size = Number(output.size);
    if (!Number.isFinite(size) || size <= 0) {
      devWarn("출력 크기 비정상", output.size);
      return null;
    }

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // AC 1·2·6을 Metro 로그로 닫는 계측 1줄 (D12) — 릴리스 번들에서는 제거된다
      console.log(
        `[transcode] done in ${Date.now() - startedAt} ms (${output.width}×${output.height}, ${size} bytes)`,
      );
    }
    return {
      uri: outputUri,
      width: output.width,
      height: output.height,
      size,
      duration: Number(output.duration),
    };
  } catch (error) {
    devWarn("변환 실패", error);
    return null;
  }
};
