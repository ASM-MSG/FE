import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MapPin, Sparkles } from "lucide-react-native";
import { palette, semantic } from "@fillmap/design-tokens";
import { AppHeader, Button, Selector, cx } from "@fillmap/ui-native";
import { VISIBILITY_OPTIONS } from "../../video-actions/model/video-menu";
import { useUploadLocation } from "../api/use-upload-location";
import { useConfirmUpload } from "../api/use-upload-mutations";
import { STAGE_FAILURE_MESSAGES } from "../model/analysis-copy";
import { buildConfirmInput, canPublishUpload } from "../model/confirm-input";
import { eventUploadLabel } from "../model/event-upload-target";
import { formatSegmentLabel } from "../model/highlight-selection";
import { useUploadFlowHydrated } from "../model/upload-flow-persistence";
import { backRouteFromPreview } from "../model/upload-flow-resume";
import {
  selectSelectedSegment,
  uploadFlowStore,
  useUploadFlow,
} from "../model/upload-flow-store";
import { UploadFlowError } from "../model/upload-orchestration";
import { useHardwareBack } from "./use-hardware-back";
import { UploadCompleteView } from "./upload-complete-view";
import { UploadVideoPreview } from "./upload-video-preview";

/**
 * SOURCE: Figma "업로드 미리보기" (node 14799:26099) — 기준 19~22·27·29·34.
 * 실 영상 프리뷰 + 선택 구간 카드 + 위치 카드를 확인하고 [업로드하기]로 확정한다.
 *
 * 현행 대비 사라지는 것들은 전부 의도다: "개인정보 자동 블러" 카드는 블러가 업로드
 * 후처리로 빠지며 폐기됐고(오탐 방지 8), "4/4 단계 · 최종 확인" 행은 Figma 정본에 없다.
 * 구간 카드의 사유 문장("조회수·움직임 기반 …")도 플레이스홀더라 시간·길이 문구로
 * 대체된다(오탐 방지 2). 위치는 mock 상수가 아니라 역지오코딩 결과다(오탐 방지 4).
 *
 * 완료 화면은 라우트가 아니라 이 화면의 전면 오버레이다(D6) — 하드웨어 뒤로가기로
 * 되돌아가 이미 확정된 업로드를 재게시하는 경로를 만들지 않기 위해서다.
 */
export const PreviewScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useUploadFlowHydrated();
  const flow = useUploadFlow();
  const location = useUploadLocation();
  const confirm = useConfirmUpload();
  const [completed, setCompleted] = useState(false);

  const segment = selectSelectedSegment(flow);
  // 행사 귀속 업로드는 좌표를 보내지 않아 측위를 기다리지 않는다 (MSG-560 D12)
  const canPublish = canPublishUpload({
    video: flow.video,
    segment,
    center: location.center,
    submitting: confirm.isPending,
    eventTarget: flow.eventTarget,
  });
  const locationLabel =
    flow.eventTarget === null
      ? location.label
      : eventUploadLabel(
          flow.eventTarget.occurrenceTitle,
          flow.eventTarget.locationName,
        );

  /** [확인] — 스택 해제 + 홈 복귀 + 플로우 초기화(영속 값 제거 포함) (기준 29·39) */
  const finish = () => {
    uploadFlowStore.reset();
    router.dismissTo("/home");
  };

  /**
   * 이전 단계로 (기준 22) — 진행된 presign·S3 PUT을 버린다. 빠뜨리면 다른 구간으로
   * 재게시할 때 직전 s3Key로 확정되는 정합성 버그가 된다(웹 backToHighlight 선례).
   *
   * 복귀 지점은 `backRouteFromPreview`(흐름 상태)가 정하고 **명시 이동**한다 —
   * `router.back()`은 스택 이력에 기대는데 콜드 스타트로 복원된 흐름은 스택이
   * `[/home, /upload/preview]`뿐이라 하이라이트를 건너뛰고 홈으로 나가버린다(codex 리뷰 P1).
   */
  const goBack = () => {
    if (confirm.isPending) return;
    const target = backRouteFromPreview(flow);
    if (target === "/upload/highlight") {
      uploadFlowStore.backToHighlight();
    } else {
      uploadFlowStore.backToSelect();
    }
    router.replace(target);
  };

  /**
   * 하드웨어/제스처 백도 같은 이탈 경로를 태운다 (codex 리뷰 3회차 P2) — 우회하면 사용자는
   * 이전 화면을 보는데 영속 스텝은 preview로 남아 재시작이 예기치 않게 미리보기로 재개된다.
   * 완료 화면에서는 이미 정리가 끝났으므로(settleUploadSuccess) 홈으로 보낸다.
   */
  useHardwareBack(() => {
    if (completed) {
      finish();
      return;
    }
    goBack();
  });

  // 재수화 전에는 렌더하지 않는다 — 복원값 깜빡임 방지 (기준 38)
  if (!hydrated) return <View className="flex-1 bg-background" />;

  /**
   * [업로드하기] (기준 24) — 진행 중 재탭은 무동작 (기준 35).
   * 중복 차단은 `confirm.publish`의 **동기** 잠금이 한다. `confirm.isPending`만 보면
   * 같은 틱의 두 번째 탭 시점에는 아직 false라 확정 체인이 두 번 완주하고,
   * 실제로 서버에 중복 영상이 생성됐다(실측 videoId 287+288 / 289+290).
   */
  const publish = () => {
    if (!canPublish || flow.video === null || segment === null) return;
    confirm.publish(
      buildConfirmInput(
        flow.video,
        segment,
        location.center,
        flow.eventTarget,
        flow.visibility,
      ),
      {
        onSuccess: () => setCompleted(true),
        // 실패 표시는 confirm.error 파생 — 재탭이 성공 단계를 건너뛴다 (기준 34)
      },
    );
  };

  const failureMessage = confirm.isError
    ? STAGE_FAILURE_MESSAGES[
        confirm.error instanceof UploadFlowError
          ? confirm.error.stage
          : "finalize"
      ]
    : null;

  return (
    <View
      className="flex-1 bg-background"
      // 하단 인셋은 스크롤 콘텐츠가 아니라 바깥 View가 갖는다 — react-doctor
      // `rn-scrollview-dynamic-padding`이 contentContainerStyle의 인셋 패딩을 막는다
      // (인셋은 기기 고정값이라 오탐이지만 규칙 off가 v0.9.3 스캐너에 안 먹는다, CLAUDE.md 08-28)
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <AppHeader title="업로드 미리보기" onBack={goBack} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-md pb-6"
      >
        {/* 실 영상 프리뷰 (기준 19) — 최종 확인이라 재생 컨트롤을 연다 */}
        <UploadVideoPreview uri={flow.video?.uri ?? null} nativeControls />

        {/* AI 하이라이트 구간 다크 카드 (기준 19) — 우측 시간 슬롯이 Toast에 없어 화면 전용 조립 */}
        <View className="mt-md w-full flex-row items-center gap-sm rounded-lg bg-foreground py-3.5 pl-3.5 pr-md">
          <View className="size-7.5 items-center justify-center rounded-full bg-primary">
            <Sparkles size={14} color={semantic.onPrimary} />
          </View>
          <Text className="flex-1 text-fm-base font-semibold text-foreground-inverse">
            AI 하이라이트 구간
          </Text>
          <Text className="text-fm-label text-highlight">
            {segment === null ? "-" : formatSegmentLabel(segment)}
          </Text>
        </View>

        {/* 위치 카드 (기준 20) — 역지오코딩 regionName, 없으면 "현재 위치" */}
        <View className="mt-sm rounded-lg border border-border bg-surface-soft p-md">
          <Text className="text-fm-label text-foreground-muted">위치</Text>
          <View className="mt-xxs flex-row items-center gap-xs">
            <MapPin size={14} color={palette["red-500"]} />
            <Text className="text-fm-body-strong text-foreground">
              {locationLabel}
            </Text>
          </View>
        </View>

        {/* 공개 범위 카드 (MSG-572 D7) — 일반 업로드만. 행사 귀속은 DTO에 필드가 없어 미노출.
            행 Pressable을 `accessible`로 묶어 내부 Selector와 한 a11y 노드(radio)로 낭독되게 하고,
            Selector에도 같은 핸들러를 달아 20dp 원을 직접 눌러도 동작한다(중첩 Pressable은
            안쪽이 이벤트를 먹는다). 그룹 의미는 RN에 Radix 대응 프리미티브가 없어 radiogroup 컨테이너로 */}
        {flow.eventTarget === null && (
          <View className="mt-sm rounded-lg border border-border bg-surface-soft p-md">
            <Text className="text-fm-label text-foreground-muted">
              공개 범위
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="공개 범위"
              className="mt-xxs flex-row items-center gap-lg"
            >
              {VISIBILITY_OPTIONS.map((option) => {
                const checked = flow.visibility === option.value;
                const select = () =>
                  uploadFlowStore.setVisibility(option.value);
                return (
                  <Pressable
                    key={option.value}
                    accessible
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked,
                      disabled: confirm.isPending,
                    }}
                    disabled={confirm.isPending}
                    onPress={select}
                    // 비활성 시 Selector만 스스로 dim 되고 라벨은 밝게 남던 것을 행 단위로 맞춘다 (PR #142 Claude 리뷰 🟢)
                    className={cx(
                      "min-h-11 flex-row items-center gap-xs",
                      confirm.isPending && "opacity-50",
                    )}
                  >
                    <Selector
                      type="radio"
                      checked={checked}
                      disabled={confirm.isPending}
                      onCheckedChange={select}
                    />
                    <Text className="text-fm-body text-foreground">
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 단계 구분 실패 안내 (기준 34) */}
        {failureMessage !== null && (
          <Text
            accessibilityLiveRegion="polite"
            className="mt-sm text-fm-label text-error"
          >
            {failureMessage} — [업로드하기]로 다시 시도할 수 있어요
          </Text>
        )}

        {/* CTA (기준 19·22·35) */}
        {/* 좌표 확보 전에는 비활성 + 대기 표시 — 눌러도 아무 일이 없는 상태를 만들지 않는다
            (codex 리뷰 P2, `resolveMapCenter()`가 비동기다) */}
        <Button
          text={
            confirm.isPending
              ? "업로드 중…"
              : !canPublish && location.center === null
                ? "위치 확인 중…"
                : "업로드하기"
          }
          shape="pill"
          className="mt-lg w-full"
          disabled={!canPublish}
          onPress={publish}
        />
        {/* 하이라이트를 거쳐 왔을 때만 노출한다 — 추천이 없어 건너뛴 흐름
            (analyzing → preview)에는 돌아갈 하이라이트가 없다 (웹 wentThroughHighlight) */}
        {backRouteFromPreview(flow) === "/upload/highlight" && (
          <Button
            text="이전 단계로"
            variant="secondary"
            shape="pill"
            className="mt-sm w-full border border-border"
            disabled={confirm.isPending}
            onPress={goBack}
          />
        )}
      </ScrollView>

      {/* 완료 오버레이 (기준 27·29, D6) */}
      {completed && <UploadCompleteView onConfirm={finish} />}
    </View>
  );
};
