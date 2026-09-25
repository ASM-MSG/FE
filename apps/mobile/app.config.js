/**
 * **이 파일은 반드시 `.js`여야 한다.** Expo가 설정 파일을 읽을 때 쓰는
 * `@expo/require-utils`가 node의 타입 스트리핑을 `mode: "transform"`으로 호출하는데,
 * node 26이 그 모드를 제거하고 `"strip"`만 허용한다. `.ts`로 두면 설정을 읽는 모든
 * 명령(`expo start`·`run:android`·`run:ios`·`prebuild`·`export`)이 아래 오류로 죽는다:
 *   `The property 'options.mode' must be one of: 'strip'. Received 'transform'`
 * `.js`는 그 변환 경로 자체를 타지 않는다. 타입은 JSDoc + tsconfig `checkJs`로 유지한다.
 * Expo/node 조합이 정리되면 `.ts`로 되돌려도 된다.
 */

/**
 * MSG-294: 네이버 지도 클라이언트 키 주입을 위해 app.json → 동적 설정(app.config) 전환.
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

/**
 * MSG-444: 카카오 네이티브 SDK 앱 키 (.env의 EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY).
 * 웹이 쓰는 REST API 키와 다른 값이다 — 네이티브 앱 키는 클라이언트 공개를 전제로 하고
 * 카카오 콘솔의 **패키지명 + 키 해시** 등록으로 보호된다.
 *
 * 값이 없으면 플러그인을 **아예 등록하지 않는다** — `@react-native-kakao/core`의 config
 * plugin은 빈 키에 throw해서, 등록해 두면 키 없는 환경의 `expo start`·`prebuild`가 통째로
 * 죽는다(네이버 지도 키의 `?? ""` 처리와 갈리는 지점). 조용한 누락이 되지 않도록 여기서
 * 경고하고, 실제 실패는 런타임 어댑터가 사용자 문구로 낸다 (kakao-adapter.ts).
 */
const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? "";
if (!kakaoNativeAppKey) {
  console.warn(
    "[app.config] EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY 미설정 — 카카오 로그인 네이티브 설정을 건너뜁니다 (.env.example 참조)",
  );
}

/**
 * 조건부 등록이라 배열로 만들어 스프레드한다. 타입을 명시하지 않으면 삼항의 빈 배열이
 * `never[]`로 좁혀져 plugins 튜플 추론이 깨진다(tsc TS2322).
 * @type {NonNullable<import("expo/config").ExpoConfig["plugins"]>}
 */
const kakaoPlugins = kakaoNativeAppKey
  ? [
      [
        "@react-native-kakao/core",
        {
          nativeAppKey: kakaoNativeAppKey,
          // `android`·`ios` 객체를 넘기지 않으면 플러그인이 두 블록을 **통째로 건너뛴다**
          // (`if (android)` / `if (ios)`) — 플러그인은 등록됐는데 매니페스트에는 아무것도
          // 안 들어가고, 로그인은 실기에서야 실패한다. prebuild 산출물 대조로 실측 확인했다.
          // authCodeHandlerActivity: 카카오계정 웹 로그인이 `kakao{앱키}://oauth`로 돌아올
          // 인가 코드 수신 액티비티. 이게 없으면 카카오톡 미설치 경로가 끊긴다.
          android: { authCodeHandlerActivity: true },
          // handleKakaoOpenUrl: 같은 스킴의 iOS 복귀 처리 (Android 우선이라 미검증, 스펙 Q7)
          ios: { handleKakaoOpenUrl: true },
        },
      ],
    ]
  : [];

/**
 * @param {import("expo/config").ConfigContext} _ctx
 * @returns {import("expo/config").ExpoConfig}
 */
export default (_ctx) => ({
  name: "필맵",
  slug: "fillmap",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "fillmap",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "kr.fillmap.app",
    // MSG-601: Sign in with Apple 엔타이틀먼트(`com.apple.developer.applesignin`) 주입.
    // 번들 ID가 곧 client_id라 환경변수가 없다. 유료 개발자 팀 서명이 있어야 빌드된다(스펙 R1).
    usesAppleSignIn: true,
    // MSG-604: Firebase iOS 앱 설정(fillmap-edd7d / kr.fillmap.app) — `@react-native-firebase/app`
    // 플러그인이 Xcode 프로젝트에 복사하고 AppDelegate에 `FirebaseApp.configure()`를 주입한다.
    // iOS 푸시는 APNs 원시 토큰이 아니라 FCM 등록 토큰이어야 서버(FCM Admin)가 보낼 수 있다.
    googleServicesFile: "./GoogleService-Info.plist",
    // 백그라운드 원격 알림 수신 모드 — messaging 플러그인은 엔타이틀먼트(aps-environment)만 주입하고
    // UIBackgroundModes는 넣지 않는다(prebuild 실측). 없으면 앱이 백그라운드일 때 data 메시지가 안 온다.
    // MSG-606: 심사 대비 — 표준 암호화(HTTPS)만 써서 수출 규정 문답을 건너뛴다(L5), 빌드 번호 명시(L6).
    buildNumber: "3",
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
    },
    // MSG-606 M5: 앱 개인정보 매니페스트 — 실제 수집 항목(위치·이메일·사용자 콘텐츠·사용자 ID·푸시 토큰).
    // App Store Connect "앱 개인정보" 라벨은 이 목록과 일치시켜 별도 작성한다. 추적(NSPrivacyTracking)은 없다.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePreciseLocation",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePhotosorVideos",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeOtherUserContent",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
        {
          NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeDeviceID",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ["NSPrivacyCollectedDataTypePurposeAppFunctionality"],
        },
      ],
    },
  },
  android: {
    /**
     * 런처 아이콘 — Figma `feelmap-logo`(15166:2928) 원본에서 생성.
     * 원본은 흰 배경에 마크가 플랫하게 눌러붙은 알파 없는 PNG다. 그대로 foreground에
     * 넣으면 그 흰 사각형이 런처 마스크에 한 번 더 깎여 이중 라운딩으로 보인다.
     * 그래서 마크만 알파로 분리해 전경에 두고, 원본의 흰 배경은 backgroundColor로
     * 재현한다 (backgroundImage는 불필요해져 에셋째 삭제).
     * 전경 캔버스 1024px = 어댑티브 아이콘 108dp. 마크의 외접원을 66dp 키라인에
     * 맞춰 중앙 배치했으므로 원·스퀘어클 등 어떤 마스크에서도 잘리지 않는다.
     * monochrome(안드로이드 13+ 테마 아이콘)은 같은 배치의 흰 실루엣이며 핀만 뚫려 있다.
     * 에셋을 갈아끼운 뒤에는 `expo prebuild -p android`로 mipmap을 다시 만들어야 반영된다.
     */
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "kr.fillmap.app",
    // FCM 프로젝트 설정(fillmap-edd7d) — 등록 패키지명이 android.package와 일치해야 한다.
    // prebuild가 android/app/으로 복사한다. 푸시 수신(expo-notifications 권한·기기 토큰
    // 등록·알림 탭 진입)은 **MSG-429**가 구현했다 — 종전 주석의 MSG-418 귀속은 오기였다.
    // MSG-418은 지오펜싱 로컬 알림 기획 티켓이라 FCM 파이프라인을 타지 않는다.
    googleServicesFile: "./google-services.json",
  },
  plugins: [
    "./plugins/with-pnpm-node-path.js",
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
    // MSG-606 H1: 위치 권한 문구 — 플러그인 기본값("Allow $(PRODUCT_NAME) to access your location")은
    // 목적이 없어 심사 반려 1순위. 앱은 포그라운드 위치만 쓴다(`shared/geolocation.ts`) — Always·모션 키는
    // 넣지 않는다(쓰지 않는 권한 문구가 Info.plist에 있으면 그것도 지적 대상).
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "현재 위치 주변 격자를 지도에 보여 주고, 촬영한 영상의 위치를 기록하려면 위치 권한이 필요해요.",
        locationAlwaysPermission: false,
        locationAlwaysAndWhenInUsePermission: false,
        motionUsagePermission:
          "걸음·이동 감지에는 쓰지 않아요. 지도 라이브러리가 요구하는 항목으로, 필맵은 모션 데이터를 수집하지 않아요.",
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    // MSG-304: 블러 확인 화면 프리뷰 재생 (expo install 안내에 따른 플러그인 등록)
    "expo-video",
    // MSG-429: 블러 완료 푸시 수신 — 권한·FCM 기기 토큰·알림 탭 진입.
    // 네이티브 모듈이라 `expo prebuild -p android` → `run:android` 재빌드가 필요하다.
    "expo-notifications",
    [
      "@mj-studio/react-native-naver-map",
      {
        client_id: naverMapClientId,
      },
    ],
    // MSG-444: 카카오 로그인 네이티브 설정 — AndroidManifest의 `kakao{앱키}` 스킴 인가
    // 핸들러와 iOS CFBundleURLTypes를 플러그인이 주입한다. 키가 없으면 등록하지 않는다(위 주석).
    ...kakaoPlugins,
    // MSG-601: 애플 로그인 — iOS 전용 플러그인(엔타이틀먼트 주입)이라 Android prebuild 산출물은
    // 무변화. 카카오와 달리 키가 없어 무조건 등록한다. `expo-crypto`(nonce)는 플러그인 없이 autolink
    // 되지만 네이티브 모듈이라 Android도 `prebuild --clean` + 재빌드가 필요하다(스펙 R2).
    "expo-apple-authentication",
    // MSG-604: iOS FCM 등록 토큰 발급 — messaging 플러그인이 `aps-environment` 엔타이틀먼트와
    // `remote-notification` 백그라운드 모드를 주입한다. Android는 expo-notifications 경로 그대로라
    // Firebase 플러그인의 google-services gradle 적용만 겹치고 동작은 무변화(같은 google-services.json).
    // `disableSPM`: RNFirebase 26은 기본으로 Firebase를 Swift Package(SPM)로 가져오는데, 이 경우
    // 정적 링크(use_frameworks 없음·static 모두)를 pod install이 거부한다(실측 "SPM + static linkage
    // is not supported"). 동적 프레임워크는 네이버 지도·카카오 pod와의 호환을 새로 검증해야 하므로
    // SPM을 끄고 종전 CocoaPods 경로(+ 정적 프레임워크)를 쓴다.
    ["@react-native-firebase/app", { ios: { disableSPM: true } }],
    "@react-native-firebase/messaging",
    [
      "expo-build-properties",
      {
        // MSG-604: Firebase iOS SDK(CocoaPods 경로)가 정적 프레임워크를 요구한다 — 위 disableSPM과 한 쌍.
        ios: { useFrameworks: "static" },
        android: {
          extraMavenRepos: [
            // 네이버 지도 SDK 배포 저장소 (라이브러리 공식 Expo 설치 절차)
            "https://repository.map.naver.com/archive/maven",
            // MSG-444: 카카오 SDK 배포 저장소. `com.kakao.sdk:v2-*`는 Maven Central에
            // 없어(2.20.1 기준 404) 이 저장소가 없으면 gradle이 의존성 해석 단계에서
            // 실패한다 — 실측으로 확인한 빌드 블로커다.
            "https://devrepo.kakao.com/nexus/content/groups/public/",
          ],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
});
