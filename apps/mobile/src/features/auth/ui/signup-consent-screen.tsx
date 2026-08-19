import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { BackHandler, Pressable, ScrollView, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader, Button, Checkbox } from "@fillmap/ui-native";
import { useLogout } from "../api/use-logout";
import { useUpdateLocationConsent } from "../api/use-update-location-consent";
import {
  CONSENT_ITEMS,
  INITIAL_CONSENT_STATE,
  canSubmitConsent,
  isAllAgreed,
  toggleAll,
  toggleItem,
} from "../model/signup-consent";
import { ConsentTermsView } from "./consent-terms-view";

/**
 * SOURCE: Figma 회원가입 — 약관 동의 14870:430(미동의) / 14870:467(전체 동의) — 390×844.
 * 두 프레임은 같은 화면의 상태 차이라 한 컴포넌트가 둘을 모두 렌더한다.
 *
 * 게이트 화면 (MSG-422) — 로그인했지만 `locationConsent=false`인 사용자에게 `Stack` 대신
 * 전면 렌더된다(app/_layout.tsx 조건 렌더 — 라우트 신설 없음, 딥링크 우회 방지가 의도).
 *
 * - 초기 5개 전부 미체크 + CTA 비활성 = Figma 미동의 프레임 (AC 9). 웹과 의도적으로 다르다
 * - CTA = `PUT location-consent {consented:true}` 1회 → getMe invalidate 경유로 게이트가
 *   스스로 풀린다 (AC 18). 별도 화면 이동 없음
 * - 만14세·이용약관·개인정보·마케팅 체크는 요청을 만들지 않는다 — 저장할 서버 필드가
 *   없다(승인 Q1, AC 21). 법적 이력 저장 API는 BE 환류 대상
 * - 헤더 `‹`·하드웨어 뒤로가기 = 로그인 중단(로그아웃) — 1회 가드로 두 트리거가 요청을
 *   한 번만 만든다 (AC 22·23, 웹 logoutRequestedRef 선례)
 * - 하단 캡션("선택 항목 동의는 나중에 프로필 편집에서 바꿀 수 있어요.")은 렌더하지 않는다 —
 *   인앱 변경 수단이 없어 거짓 문구가 된다 (승인 Q2, Figma 대비 의도된 차이)
 * - OS 위치 권한(expo-location)은 요청하지 않는다 — 법적 약관 동의까지가 범위 (AC 24)
 */
export const SignupConsentScreen = () => {
  const [consent, setConsent] = useState(INITIAL_CONSENT_STATE);
  /** 열려 있는 약관 전문의 문서명 — null이면 동의 화면 (AC 25, 게이트 내부 상태) */
  const [openedTerms, setOpenedTerms] = useState<string | null>(null);
  const {
    mutate: saveConsent,
    isPending: isSaving,
    isError: isSaveFailed,
  } = useUpdateLocationConsent();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  // 헤더 `‹`와 하드웨어 뒤로가기의 공용 1회 가드 (AC 23) — 어느 쪽이 먼저 시작하든
  // 다른 쪽 발화를 막아 로그아웃 요청이 하나만 나간다. 실패해도 onSettled가 로컬 세션을
  // 끊어 게이트가 닫히므로 리셋하지 않는다 (웹 logoutRequestedRef 선례)
  //
  // 저장이 비행 중이면 이탈을 받지 않는다 — CTA를 누른 직후 뒤로가기를 누르면 로컬 세션은
  // 즉시 끊기는데 이미 발사된 PUT은 뒤늦게 성공할 수 있어, "중단했는데 서버에는
  // consented:true가 남는" 불확정 상태가 된다. 동의 이력이 이 화면의 존재 이유이므로
  // 요청이 끝날 때까지 판정을 미룬다. 창은 유한하다 — ky 기본 timeout 10초 안에 성공이든
  // 실패든 isSaving이 풀리고(실패면 인라인 안내 + 재시도), 성공하면 게이트 자체가 닫힌다
  const logoutRequestedRef = useRef(false);
  const abortSignup = useCallback(() => {
    if (logoutRequestedRef.current || isSaving) return;
    logoutRequestedRef.current = true;
    logout();
  }, [logout, isSaving]);

  // 게이트가 Stack을 대체하면 app/index.tsx가 마운트되지 않아 hideAsync()가 불리지
  // 않는다 — 스플래시가 영구히 남아 게이트가 아예 안 보이는 사고를 막는다 (AC 6)
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  // 하드웨어 뒤로가기 (AC 22) — 약관 전문이 열려 있으면 그것만 닫고, 동의 화면에서는
  // 로그인 중단이다. 어느 경우든 true를 돌려줘 기본 동작(앱 종료·이전 화면)을 막는다.
  // Effect Event로 감싸 구독을 마운트 1회로 고정한다 — 본문이 읽는 openedTerms·abortSignup은
  // 매번 최신이지만 의존성이 아니므로, 전문 뷰 토글이나 저장 상태 변화가 BackHandler를
  // 재등록시키지 않는다 (react-doctor prefer-use-effect-event)
  const handleHardwareBack = useEffectEvent(() => {
    if (openedTerms !== null) {
      setOpenedTerms(null);
      return true;
    }
    abortSignup();
    return true;
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () =>
      handleHardwareBack(),
    );
    return () => subscription.remove();
  }, []);

  // 게이트 내부 전면 뷰 — 체크 상태(consent)는 이 컴포넌트가 계속 보유하므로 유지된다 (AC 25)
  if (openedTerms !== null) {
    return (
      <ConsentTermsView
        title={openedTerms}
        onClose={() => setOpenedTerms(null)}
      />
    );
  }

  const allAgreed = isAllAgreed(consent);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <AppHeader title="회원가입" onBack={abortSignup} />
      <ScrollView contentContainerClassName="gap-lg px-lg pb-lg pt-xl">
        <View className="gap-xs">
          <Text
            accessibilityRole="header"
            className="text-fm-display text-foreground"
          >
            {"필맵\n서비스 이용약관 동의"}
          </Text>
          <Text className="text-fm-base text-foreground-body">
            필맵은 방문한 장소를 짧은 영상으로 기록하고, 지도 위 격자를 채워
            가는 서비스예요. 시작하려면 아래 약관에 동의해 주세요.
          </Text>
        </View>

        {/* 모두 동의 (AC 13) — Figma 16px 강조 라벨을 지키려고 라벨을 컨트롤 밖에 둔다
            (Checkbox의 accessibilityLabel 용법 — 내장 label은 13px 고정) */}
        <View className="flex-row items-center gap-sm py-xxs">
          <Checkbox
            variant="circle"
            checked={allAgreed}
            onChange={(next) => setConsent(toggleAll(next))}
            accessibilityLabel="모두 동의 (선택 정보 포함)"
          />
          <Text className="text-fm-heading text-foreground">
            모두 동의 (선택 정보 포함)
          </Text>
        </View>

        <View className="h-px w-full bg-border" />

        <View className="gap-xxs">
          {CONSENT_ITEMS.map((item) => (
            <View key={item.id} className="flex-row items-center gap-sm py-sm">
              <Checkbox
                variant="glyph"
                checked={consent[item.id]}
                onChange={() => setConsent((prev) => toggleItem(prev, item.id))}
                label={item.label}
                className="flex-1"
              />
              {/* 만 14세 행에는 전문이 없어 "보기"도 없다 (AC 8) */}
              {item.termsTitle !== null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.termsTitle} 전문 보기`}
                  hitSlop={12}
                  onPress={() => setOpenedTerms(item.termsTitle)}
                >
                  <Text className="text-fm-label text-foreground-muted">
                    보기
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="gap-sm px-lg pb-lg pt-sm">
        {/* 저장 실패 — 게이트 유지 + 인라인 안내, 재시도는 CTA 재탭 (AC 20, 승인 추정 7) */}
        {isSaveFailed && (
          <Text className="text-center text-fm-caption text-error">
            동의 처리에 실패했어요. 다시 시도해주세요
          </Text>
        )}
        {/* 저장 중 비활성으로 중복 탭이 추가 요청을 만들지 않는다 (AC 19). 로그인 중단
            진행 중에도 비활성 — 끊으려는 세션이 consented:true를 남기는 창을 닫는다 */}
        <Button
          text="회원가입"
          variant="primary"
          size="lg"
          shape="pill"
          className="w-full"
          disabled={!canSubmitConsent(consent) || isSaving || isLoggingOut}
          onPress={() => saveConsent(true)}
        />
      </View>
    </SafeAreaView>
  );
};
