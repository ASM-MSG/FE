import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { semantic } from "@fillmap/design-tokens";
import { Button, ProgressBar } from "@fillmap/ui-native";
import { ApiError } from "../../../shared/api/api-error";
import { formatDuration } from "../../../shared/format";
import { useAnalyzeVideo } from "../api/use-upload-mutations";
import { transcodeVideo } from "../api/video-transcoder";
import { ANALYZING_COPY, STAGE_FAILURE_MESSAGES } from "../model/analysis-copy";
import { analysisProgress } from "../model/analysis-progress";
import { shouldTranscode, toTranscodedVideo } from "../model/transcode-policy";
import { useUploadFlowHydrated } from "../model/upload-flow-persistence";
import {
  uploadFlowStore,
  useUploadFlow,
  type UploadVideo,
} from "../model/upload-flow-store";
import { UploadFlowError } from "../model/upload-orchestration";

/** 진행 바 갱신 주기 — 60fps로 돌릴 이유가 없는 의사 진행률이다 */
const PROGRESS_TICK_MS = 200;

/** 흐름 실패에서 백엔드 developCode 추출 — 복귀 지점 분기용 (웹 use-upload-wizard 동형) */
const developCodeOf = (error: unknown): number | undefined => {
  const cause = error instanceof UploadFlowError ? error.cause : error;
  return cause instanceof ApiError ? cause.developCode : undefined;
};

/**
 * SOURCE: Figma "업로드 분석 중 (로딩)" (node 14824:476) — 헤더 없는 전면 화면 (기준 1~6).
 * presign → 원본 S3 PUT → highlight-preview 동안 표시하고, 응답이 오면 추천 유무에 따라
 * 하이라이트/미리보기로 **자동 전환**한다(사용자 탭 없음).
 *
 * MSG-616 (D3·D8): presign **전에** 영상을 720p H.264/AAC로 변환하고 스토어 `video`를 변환본으로
 * 교체한다 — 선분석·확정 두 업로드가 모두 변환본으로 나간다. 변환 중에는 전용 문구와 네이티브
 * 실진행 바(`transcodeProgress`)를 보이고, 끝나면 기존 분석 문구·의사 진행률로 바뀐다. 변환 실패는
 * 원본으로 그대로 진행하며 사용자에게 알리지 않는다(D4). 정본 Figma에 "변환 중" 상태는 없다 —
 * 티켓 요구(진행 표시)로 추가한 의도된 차이.
 *
 * 뒤로가기 수단이 없다 (기준 4) — 헤더도, 안드로이드 하드웨어 백도 막는다. 분석 중
 * 이탈하면 이미 올라간 원본 S3 객체가 고아가 되고 진행 상태가 어중간해진다.
 * 실패했을 때만 [다시 시도]·[이전으로]가 생긴다.
 *
 * 진행 바는 경과 시간 기반 의사 진행률이다(D7) — Figma의 55% 채움은 정적 목업이고,
 * 실제로는 어느 순간에도 그 값에 고정돼 있지 않다(오탐 방지 6).
 */
export const AnalyzingScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useUploadFlowHydrated();
  const { video, analysisFailureStage } = useUploadFlow();
  const analyze = useAnalyzeVideo();
  const [elapsedMs, setElapsedMs] = useState(0);
  /** 변환 실진행(0~1) — null이면 변환 중이 아니다 (MSG-616 D8) */
  const [transcodeProgress, setTranscodeProgress] = useState<number | null>(
    null,
  );
  /** 발사 가드 — 재렌더·재수화로 분석이 두 번 나가지 않게 (기준 35) */
  const started = useRef(false);

  // 하드웨어 백 차단 (기준 4) — 실패 상태에서는 [이전으로]가 대신 나간다
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  // 경과 시간 → 의사 진행률 (기준 3) — 변환이 끝난 시점부터 센다
  useEffect(() => {
    if (analysisFailureStage !== null || transcodeProgress !== null) return;
    const startedAt = Date.now();
    const timer = setInterval(
      () => setElapsedMs(Date.now() - startedAt),
      PROGRESS_TICK_MS,
    );
    return () => clearInterval(timer);
  }, [analysisFailureStage, transcodeProgress]);

  /**
   * 선분석 발사 (기준 31·35) — 중복 차단은 `analyze.start`의 **동기** 잠금이 한다.
   * `analyze.isPending`만 보면 [다시 시도] 연타가 선분석을 이중 발사해 고아 S3 객체가 남는다.
   * 변환 직후 호출은 스토어 교체가 리렌더로 반영되기 전이라 `video`를 인자로 받는다.
   */
  const runAnalysis = (target: UploadVideo | null = video) => {
    if (target === null) return;
    analyze.start(
      {
        uri: target.uri,
        fileName: target.fileName,
        fileSize: target.fileSize ?? 0,
        contentType: target.mimeType ?? "video/mp4",
      },
      {
        onSuccess: (highlights) => {
          uploadFlowStore.completeAnalysis(highlights);
          // 추천 유무는 스토어가 판정했다 — 화면은 그 스텝으로 이동만 한다 (기준 6)
          router.replace(
            uploadFlowStore.getState().step === "highlight"
              ? "/upload/highlight"
              : "/upload/preview",
          );
        },
        onError: (error) => {
          // 준비 단계(presign·원본 PUT) 실패 — 이 화면에서 재시도 (기준 31)
          if (error instanceof UploadFlowError && error.stage !== "finalize") {
            uploadFlowStore.failAnalysisStage(error.stage);
            return;
          }
          uploadFlowStore.failAnalysis(developCodeOf(error));
          router.replace(
            uploadFlowStore.getState().step === "select"
              ? "/upload"
              : "/upload/highlight",
          );
        },
      },
    );
  };

  // 재수화 완료 후 1회 발사 (기준 35·38) — 변환(필요 시) → 스토어 교체 → 선분석 (MSG-616 D3·D5).
  // 실패·건너뜀은 원본 그대로. 변환 중 effect가 정리되면(StrictMode 이중 실행·언마운트) `AbortController`로
  // 네이티브 압축을 취소하고 후속 흐름(setState·replaceVideo·선분석)을 끊은 뒤 `started`를 되돌려 다음
  // 실행이 처음부터 다시 돈다 — 가드만 남기면 두 번째 실행이 early return하고 첫 결과는 버려져 화면이
  // 영구 정지한다(클로드 리뷰 #173). `cancelled` 지역 변수는 `signal.aborted`와 같은 값이지만 react-doctor
  // no-set-state-after-await-in-effect가 인식하는 형태라 병행한다(signal만으로는 경고가 남았다, 실측).
  useEffect(() => {
    if (!hydrated || started.current) return;
    const current = uploadFlowStore.getState().video;
    if (current === null) {
      // 딥링크·복원 실패로 영상 없이 열린 경우 — 선택 화면으로 되돌린다
      router.replace("/upload");
      return;
    }
    started.current = true;
    if (!shouldTranscode(current)) {
      runAnalysis(current);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setTranscodeProgress(0);
    void (async () => {
      const outcome = await transcodeVideo(
        current,
        (progress) => {
          if (!cancelled) setTranscodeProgress(progress);
        },
        controller.signal,
      );
      if (cancelled) return;
      if (outcome !== null) {
        uploadFlowStore.replaceVideo(toTranscodedVideo(current, outcome));
      }
      setTranscodeProgress(null);
      // 스토어가 교체를 무시했을 수 있다(원본 PUT 완료 후 재개) — 선분석 입력은 항상 스토어 값
      runAnalysis(uploadFlowStore.getState().video);
    })();
    return () => {
      cancelled = true;
      controller.abort();
      started.current = false;
    };
    // 최초 1회만 발사한다 — started 가드가 재실행을 막으므로 의존성은 hydrated뿐이다
    // oxlint-disable-next-line react/exhaustive-deps
  }, [hydrated]);

  // 재수화 전에는 렌더하지 않는다 — 복원값 깜빡임 방지 (기준 38)
  if (!hydrated) return <View className="flex-1 bg-background" />;

  const failureMessage =
    analysisFailureStage !== null
      ? STAGE_FAILURE_MESSAGES[analysisFailureStage]
      : null;
  const transcoding = transcodeProgress !== null;

  return (
    <View
      className="flex-1 items-center justify-center gap-md bg-background px-5"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {failureMessage === null ? (
        <>
          <ActivityIndicator size="large" color={semantic.primary} />
          <Text className="text-fm-heading text-foreground">
            {transcoding
              ? ANALYZING_COPY.transcodingTitle
              : ANALYZING_COPY.title}
          </Text>
          <Text className="text-center text-fm-body text-foreground-body">
            {transcoding
              ? ANALYZING_COPY.transcodingDescription
              : ANALYZING_COPY.description}
          </Text>
          <ProgressBar
            className="mt-xs"
            value={
              transcoding ? transcodeProgress : analysisProgress(elapsedMs)
            }
          />
          {!transcoding && (
            <Text className="text-fm-caption text-foreground-muted">
              {ANALYZING_COPY.estimate}
              {video?.durationSec != null &&
                ` · 영상 길이 ${formatDuration(video.durationSec)}`}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text className="text-fm-heading text-foreground">
            {ANALYZING_COPY.failureTitle}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            className="text-center text-fm-body text-foreground-body"
          >
            {failureMessage}
          </Text>
          <Button
            text="다시 시도"
            shape="pill"
            className="mt-xs w-full"
            disabled={analyze.isPending}
            onPress={() => {
              // 성공한 단계(presign·PUT)는 오케스트레이션 상태가 건너뛴다 (기준 31)
              uploadFlowStore.retryAnalysis();
              runAnalysis();
            }}
          />
          <Button
            text="이전으로"
            variant="secondary"
            shape="pill"
            className="w-full border border-border"
            onPress={() => {
              uploadFlowStore.backToSelect();
              router.replace("/upload");
            }}
          />
        </>
      )}
    </View>
  );
};
