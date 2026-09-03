import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MapPin } from "lucide-react-native";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { palette } from "@fillmap/design-tokens";
import { AppHeader, Button, Chip, Toast } from "@fillmap/ui-native";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { useUploadLocation } from "../api/use-upload-location";
import { eventUploadLabel } from "../model/event-upload-target";
import { resolvePickOutcome, type PickOutcome } from "../model/pick-result";
import { resolveSelectionRejection } from "../model/select-validation";
import { FILE_CONSTRAINT_TEXT } from "../model/upload-copy";
import { useUploadFlowHydrated } from "../model/upload-flow-persistence";
import { uploadFlowStore, useUploadFlow } from "../model/upload-flow-store";

/** 권한 거부 안내 문구 (MSG-302 AC 9) — 화면 내 인라인 텍스트 */
const DENIED_NOTICE = {
  gallery: "갤러리 접근 권한이 필요해요. 설정에서 사진 접근을 허용해주세요.",
  camera: "카메라 접근 권한이 필요해요. 설정에서 카메라 접근을 허용해주세요.",
} as const;

type PickSource = keyof typeof DENIED_NOTICE;

/**
 * SOURCE: Figma "영상 업로드" (node 14094:4263) — 업로드 플로우 진입 화면 (MSG-302 → MSG-424).
 * 갤러리/카메라로 영상 확보 → 파일 사전 검증 → **분석 중 화면**(/upload/analyzing)으로
 * 전환한다(기준 1). `router.replace`로 가는 이유: 분석 중에는 뒤로 돌아올 수단이 없어야
 * 하고(기준 4), 실패 복귀는 분석 화면이 스스로 replace로 수행한다.
 *
 * 위치 태그는 mock 상수가 아니라 역지오코딩 실데이터이고(기준 20), AI 안내 카드 문구는
 * 실제 처리 구조에 맞게 정정했다 — 블러는 업로드 **전**이 아니라 후처리다.
 */
export const UploadScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useUploadFlowHydrated();
  const { selectFailureMessage, eventTarget } = useUploadFlow();
  const location = useUploadLocation();
  // 행사 귀속 진입은 좌표 대신 `{행사명} · {위치명}`을 태그로 보인다 (MSG-560 D12)
  const locationLabel =
    eventTarget === null
      ? location.label
      : eventUploadLabel(eventTarget.occurrenceTitle, eventTarget.locationName);
  const [notice, setNotice] = useState<string | null>(null);

  /** 판정 결과 적용 — 거부: 안내 / 취소: 무동작 / 확보: 검증 후 분석 전진 */
  const applyOutcome = (outcome: PickOutcome, source: PickSource) => {
    if (outcome.kind === "denied") {
      setNotice(DENIED_NOTICE[source]);
      return;
    }
    // 권한이 확인된 경로(취소 포함)에 진입한 순간 이전 거부 안내는 무효
    setNotice(null);
    if (outcome.kind === "canceled") return;

    // 서버 3426·3425·3413을 부르기 전 같은 기준으로 먼저 거른다
    const rejection = resolveSelectionRejection(outcome.video);
    if (rejection !== null) {
      setNotice(rejection);
      return;
    }
    uploadFlowStore.startAnalysis(outcome.video);
    router.replace("/upload/analyzing");
  };

  /** 갤러리 선택 (AC 6) — 권한 승인 시 영상 전용 미디어 라이브러리 */
  const pickFromGallery = async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    const result = permission.granted
      ? await launchImageLibraryAsync({ mediaTypes: "videos" })
      : null;
    applyOutcome(resolvePickOutcome(permission.granted, result), "gallery");
  };

  /** 카메라 촬영 (AC 7) — 권한 승인 시 카메라 (iOS 시뮬레이터 불가) */
  const captureFromCamera = async () => {
    const permission = await requestCameraPermissionsAsync();
    const result = permission.granted
      ? await launchCameraAsync({ mediaTypes: "videos" })
      : null;
    applyOutcome(resolvePickOutcome(permission.granted, result), "camera");
  };

  // 재수화 전에는 렌더하지 않는다 — 복원된 실패 사유가 뒤늦게 튀지 않게 (기준 38).
  // 진행 중이던 업로드를 그 스텝으로 되돌리는 것은 앱 진입점이 한다
  // (`app/index.tsx` ← `resolveUploadResumeRoute`, 기준 36)
  if (!hydrated) return <View className="flex-1 bg-background" />;

  // 분석 실패로 복귀한 사유(파일 자체 문제)가 있으면 그것을 우선 표시한다 (기준 33)
  const failureMessage = notice ?? selectFailureMessage;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="영상 업로드" />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-lg pt-md">
          {/* 안내 문구 + 확보 버튼 2개 + 파일 제약 (AC 2) */}
          <Text className="text-fm-body text-foreground-body">
            지금 위치의 격자에 순간을 기록하세요
          </Text>
          <View className="mt-sm flex-row gap-xs">
            <Button
              text="갤러리에서 선택"
              size="sm"
              shape="pill"
              onPress={pickFromGallery}
            />
            <Button
              text="카메라로 촬영"
              size="sm"
              shape="pill"
              onPress={captureFromCamera}
            />
          </View>
          {/* 권한 거부·파일 검증·분석 실패 사유 (AC 9, 기준 33) */}
          {failureMessage !== null && (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-sm text-fm-label text-error"
            >
              {failureMessage}
            </Text>
          )}
          <Text className="mt-sm text-fm-caption text-foreground-muted">
            {FILE_CONSTRAINT_TEXT}
          </Text>

          {/* 위치 태그 (AC 4) — 역지오코딩 실데이터 (기준 20) */}
          <View className="mt-lg flex-row items-center gap-sm">
            <Text className="text-fm-body-strong text-foreground">
              위치 태그
            </Text>
            <Chip
              text={locationLabel}
              className="bg-primary/10"
              icon={<MapPin size={14} color={palette["red-500"]} />}
            />
          </View>

          {/* AI 처리 안내 카드 (AC 5) — 실제 처리 구조에 맞춘 문구 */}
          <View className="mt-lg gap-sm">
            <Toast
              variant="light"
              title="AI 하이라이트 자동 추천"
              description="영상을 올리면 AI가 최적 구간을 분석해 최대 3개 구간을 추천해요"
            />
            <Toast
              variant="light"
              title="AI 자동 블러 처리"
              description="업로드가 끝나면 얼굴과 번호판을 자동 감지해 블러 처리합니다"
            />
            <Toast
              title="업로드 전 최종 확인"
              description="추천 구간을 고른 뒤 미리보기에서 확인하고 지도에 게시해요"
            />
          </View>
        </View>
      </ScrollView>
      {/* 하단 탭바 (AC 11) — 선택 화면에만 표시, /upload에서는 활성 탭 없음 */}
      <AppBottomNav />
    </View>
  );
};
