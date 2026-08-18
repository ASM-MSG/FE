import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDevSocialLogin } from "../../features/auth/api/use-dev-login";
import { authStore, useAuth } from "../../features/auth/model/auth-session";
import { ApiError } from "../../shared/api/api-error";
import { unwrapEnvelope } from "../../shared/api/envelope";
import { getMeOptions } from "../../shared/api/query-options";

/**
 * API 기반 스모크 화면 (MSG-419 검증 장치 — AC 1·5·7·9의 관찰 지점).
 * 딥링크 전용 dev 화면으로, 프로덕션 진입 연결이 없다(`/login` 라우트 선례).
 * 진입: `npx uri-scheme open fillmap://dev/api-smoke --ios` 또는 개발 메뉴의 주소 입력.
 *
 * 관찰 항목
 * - QueryProvider 아래에서 useQuery가 로딩→성공으로 전이하는가 (AC 1)
 * - dev 로그인 후 토큰이 보안 저장소에 남아 앱 재시작에도 인증이 유지되는가 (AC 5)
 * - 실패(오프라인·5xx·401)가 흰 화면이 아니라 상태로 렌더되는가 (AC 9)
 *
 * 이후 모바일 실연동 티켓의 디버그 용도로 존치한다 (스펙 추정 4 승인).
 */

const Row = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row items-center justify-between gap-md">
    <Text className="text-fm-label text-foreground-muted">{label}</Text>
    <Text className="shrink text-right text-fm-body text-foreground">
      {value}
    </Text>
  </View>
);

const ActionButton = ({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: disabled === true }}
    disabled={disabled}
    onPress={onPress}
    className="items-center rounded-md bg-primary px-lg py-sm"
  >
    <Text className="text-fm-body text-primary-foreground">{label}</Text>
  </Pressable>
);

/** 실패 원인 표기 — 정규화가 동작하면 ApiError(status 포함)로 떨어진다 (AC 4·9) */
const describeError = (error: unknown): string => {
  if (error instanceof ApiError) {
    const status =
      error.status === undefined ? "네트워크" : `HTTP ${error.status}`;
    return `ApiError · ${status} · ${error.message}`;
  }
  return `비정규화 오류 · ${String(error)}`;
};

export default function ApiSmoke() {
  const { accessToken, refreshToken, deviceId, isAuthenticated, hydrated } =
    useAuth();
  const queryClient = useQueryClient();
  const devLogin = useDevSocialLogin();
  const me = useQuery({
    ...getMeOptions(),
    select: unwrapEnvelope,
    // 저장 토큰 재수화 전에 쏘면 로그인 상태인데도 401이 난다 (비동기 보안 저장소)
    enabled: hydrated,
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-lg p-lg">
        <Text
          accessibilityRole="header"
          className="text-fm-display text-foreground"
        >
          API 스모크
        </Text>

        <View className="gap-xs rounded-lg bg-surface p-md">
          <Row label="재수화" value={hydrated ? "완료" : "대기 중"} />
          <Row label="로그인" value={isAuthenticated ? "예" : "아니오"} />
          <Row
            label="accessToken"
            value={accessToken === null ? "없음" : "있음"}
          />
          <Row
            label="refreshToken"
            value={refreshToken === null ? "없음" : "있음"}
          />
          <Row label="deviceId" value={deviceId ?? "없음"} />
        </View>

        <View className="gap-xs rounded-lg bg-surface p-md">
          <Text className="text-fm-body-strong text-foreground">
            GET /api/users/me
          </Text>
          {me.isPending ? (
            <View className="flex-row items-center gap-xs">
              <ActivityIndicator />
              <Text className="text-fm-body text-foreground-body">
                불러오는 중…
              </Text>
            </View>
          ) : me.isError ? (
            <Text className="text-fm-body text-error">
              {describeError(me.error)}
            </Text>
          ) : (
            <Text className="text-fm-body text-foreground">
              {me.data.nickname} · {me.data.email}
            </Text>
          )}
        </View>

        <View className="gap-sm">
          <ActionButton
            label={devLogin.isPending ? "dev 로그인 중…" : "dev 로그인"}
            disabled={devLogin.isPending}
            onPress={() => devLogin.mutate()}
          />
          {devLogin.isError ? (
            <Text className="text-fm-label text-error">
              {describeError(devLogin.error)}
            </Text>
          ) : null}
          <ActionButton label="다시 조회" onPress={() => void me.refetch()} />
          <ActionButton
            label="토큰 비우기"
            onPress={() => {
              void authStore.logout();
              queryClient.clear();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
