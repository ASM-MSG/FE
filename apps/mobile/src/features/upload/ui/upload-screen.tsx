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
import { AppHeader, Button, Chip, Input, Toast } from "@fillmap/ui-native";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { resolvePickOutcome, type PickOutcome } from "../model/pick-result";
import { FILE_CONSTRAINT_TEXT, LOCATION_TAG_TEXT } from "../model/upload-copy";
import { uploadFlowStore, useUploadFlow } from "../model/upload-flow-store";

/** 권한 거부 안내 문구 (AC 9) — 화면 내 인라인 텍스트 (형태는 빌더 재량, 추정 5) */
const DENIED_NOTICE = {
  gallery: "갤러리 접근 권한이 필요해요. 설정에서 사진 접근을 허용해주세요.",
  camera: "카메라 접근 권한이 필요해요. 설정에서 카메라 접근을 허용해주세요.",
} as const;

type PickSource = keyof typeof DENIED_NOTICE;

/**
 * SOURCE: Figma "영상 업로드" (node 14094:4263) — 업로드 플로우 1/4 진입 화면 (MSG-302).
 * 갤러리/카메라로 영상 확보 → 스토어 저장 → AI 하이라이트 추천(/upload/highlight) 전진.
 * 제목·위치 태그(mock)·파일 제약·AI 안내 카드 표시. AI 처리·업로드는 전부 mock —
 * 파일 제약 검증·videoMaxDuration 옵션도 걸지 않는다 (추정 6, 제외 범위).
 * "변경" 텍스트는 탭 동작 없음(티켓 명시 mock), 하단 탭바는 이 화면에만 있다 (AC 11).
 */
export const UploadScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { title } = useUploadFlow();
  const [deniedNotice, setDeniedNotice] = useState<string | null>(null);

  /** 판정 결과 적용 (AC 8·9·10) — 거부: 안내+이동 없음 / 취소: 무동작 / 확보: 저장+전진 */
  const applyOutcome = (outcome: PickOutcome, source: PickSource) => {
    if (outcome.kind === "denied") {
      setDeniedNotice(DENIED_NOTICE[source]);
      return;
    }
    if (outcome.kind === "canceled") return;
    setDeniedNotice(null);
    uploadFlowStore.setVideo(outcome.video);
    router.navigate("/upload/highlight");
  };

  /** 갤러리 선택 (AC 6) — 권한 승인 시 영상 전용 미디어 라이브러리 */
  const pickFromGallery = async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    const result = permission.granted
      ? await launchImageLibraryAsync({ mediaTypes: "videos" })
      : null;
    applyOutcome(resolvePickOutcome(permission.granted, result), "gallery");
  };

  /** 카메라 촬영 (AC 7) — 권한 승인 시 카메라 (iOS 시뮬레이터 불가 — 리스크 1) */
  const captureFromCamera = async () => {
    const permission = await requestCameraPermissionsAsync();
    const result = permission.granted
      ? await launchCameraAsync({ mediaTypes: "videos" })
      : null;
    applyOutcome(resolvePickOutcome(permission.granted, result), "camera");
  };

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
          {/* 권한 거부 안내 (AC 9) — 거부 시에만 렌더, 다음 단계 이동 없음 */}
          {deniedNotice && (
            <Text
              accessibilityLiveRegion="polite"
              className="mt-sm text-fm-label text-error"
            >
              {deniedNotice}
            </Text>
          )}
          <Text className="mt-sm text-fm-caption text-foreground-muted">
            {FILE_CONSTRAINT_TEXT}
          </Text>

          {/* 제목 입력 (AC 3) — 미입력이어도 진행 가능 (추정 4: 검증 없음) */}
          <Text className="mt-lg text-fm-body-strong text-foreground">
            제목
          </Text>
          <Input
            className="mt-sm border-border"
            placeholder="영상 제목을 입력해주세요"
            value={title}
            onChangeText={(next) => uploadFlowStore.setTitle(next)}
          />

          {/* 위치 태그 (AC 4) — 표시 전용 mock, "변경"은 탭 동작 없음 */}
          <View className="mt-lg flex-row items-center gap-sm">
            <Text className="text-fm-body-strong text-foreground">
              위치 태그
            </Text>
            <Chip
              text={LOCATION_TAG_TEXT}
              className="bg-primary/10"
              icon={<MapPin size={14} color={palette["red-500"]} />}
            />
            <Text className="text-fm-body text-foreground-muted">변경</Text>
          </View>

          {/* AI 처리 안내 카드 3개 (AC 5) — light×2 + dark×1, 문구는 Figma 정본 */}
          <View className="mt-lg gap-sm">
            <Toast
              variant="light"
              title="AI 하이라이트 자동 추천"
              description="5초를 초과하는 영상은 AI가 최적 구간을 자동 분석해 3개 구간을 추천해요"
            />
            <Toast
              variant="light"
              title="AI 자동 블러 처리"
              description="업로드 전 얼굴과 번호판을 자동 감지해 블러 처리합니다"
            />
            <Toast
              title="업로드 전 최종 확인"
              description="AI 처리가 끝나면 미리보기에서 확인한 뒤 지도에 게시돼요"
            />
          </View>
        </View>
      </ScrollView>
      {/* 하단 탭바 (AC 11) — 302에만 표시, /upload에서는 활성 탭 없음 (리스크 3) */}
      <AppBottomNav />
    </View>
  );
};
