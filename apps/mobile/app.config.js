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
    // prebuild가 android/app/으로 복사한다. 푸시 수신(expo-notifications 권한·기기 토큰
    // 등록·알림 탭 진입)은 **MSG-429**가 구현했다 — 종전 주석의 MSG-418 귀속은 오기였다.
    // MSG-418은 지오펜싱 로컬 알림 기획 티켓이라 FCM 파이프라인을 타지 않는다.
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
    [
      "expo-build-properties",
      {
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
