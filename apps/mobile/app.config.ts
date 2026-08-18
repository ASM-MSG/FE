import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * MSG-294: 네이버 지도 클라이언트 키 주입을 위해 app.json → app.config.ts 전환.
 * 키 값은 .env의 EXPO_PUBLIC_NAVER_MAP_CLIENT_ID (gitignore — .env.example 참조).
 * 키는 prebuild 시점에 네이티브(AndroidManifest NCP_KEY_ID)로 들어가므로
 * `expo prebuild` 전에 env가 필요하다. 키 미설정이어도 빌드는 성공한다 —
 * 지도 타일 인증만 실패 (스펙 리스크 1: 키 발급은 사용자 액션).
 */
/**
 * 정본 변수명은 EXPO_PUBLIC_NAVER_MAP_CLIENT_ID (스펙).
 * EXPO_PUBLIC_NAVER_MAP_NCP_KEY_ID는 사용자가 선행 발급 시 .env.local에 쓴
 * 기존 변수명 폴백 — 이름을 옮기면 제거 가능 (빌드 리포트 기록).
 */
const naverMapClientId =
  process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ??
  process.env.EXPO_PUBLIC_NAVER_MAP_NCP_KEY_ID ??
  "";

export default (_ctx: ConfigContext): ExpoConfig => ({
  name: "FillMap",
  slug: "fillmap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "fillmap",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/expo.icon",
    bundleIdentifier: "kr.fillmap.app",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "kr.fillmap.app",
    // FCM 프로젝트 설정(fillmap-edd7d) — 등록 패키지명이 android.package와 일치해야 한다.
    // prebuild가 android/app/으로 복사한다. 푸시 수신 자체는 MSG-418(expo-notifications) 몫.
    googleServicesFile: "./google-services.json",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0066CC",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-image",
    // MSG-302: 갤러리 선택·카메라 촬영 권한 문구 (iOS Info.plist 주입)
    [
      "expo-image-picker",
      {
        photosPermission: "영상을 업로드하려면 갤러리 접근 권한이 필요해요.",
        cameraPermission: "영상을 촬영하려면 카메라 접근 권한이 필요해요.",
        microphonePermission: "영상을 촬영하려면 마이크 접근 권한이 필요해요.",
      },
    ],
    "expo-location",
    // MSG-304: 블러 확인 화면 프리뷰 재생 (expo install 안내에 따른 플러그인 등록)
    "expo-video",
    [
      "@mj-studio/react-native-naver-map",
      {
        client_id: naverMapClientId,
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          // 네이버 지도 SDK 배포 저장소 (라이브러리 공식 Expo 설치 절차)
          extraMavenRepos: ["https://repository.map.naver.com/archive/maven"],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
});
