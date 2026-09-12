import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader } from "@fillmap/ui-native";
import { DexErrorState } from "../../dex/ui/dex-error-state";
import { useAutoDismissToast } from "../../video-actions/model/use-auto-dismiss-toast";
import { ActionToast } from "../../video-actions/ui/action-toast";
import { useBlockedUsersQuery } from "../api/use-blocked-users-query";
import { useUnblockUser } from "../api/use-user-block-mutations";
import { resolveBlockListState } from "../model/user-block";
import { BlockedUserRow } from "./blocked-user-row";

/**
 * 차단한 사용자 (MSG-570 기준 13~16) — 프로필 설정에서 push. Figma 시안 없음, 신고 관리
 * 화면과 같은 앱 관례(`AppHeader` + `ScrollView` + 4상태 스위치). 실연동이라 상시 고지 카드는
 * 없다(A8). 해제는 확인 없이 발사되고 성공은 캐시 seed로 행이 즉시 빠진다(기준 14).
 * 실패 상태는 `DexErrorState`(도메인 문구 없는 공용형 — 사용처 4곳째, ui-native 승격 검토 대상)를 쓴다.
 */
export const BlockedUsersScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [toast, setToast] = useAutoDismissToast();
  const blocked = useBlockedUsersQuery();
  const unblock = useUnblockUser({
    onError: () =>
      setToast("차단을 해제하지 못했어요. 잠시 후 다시 시도해 주세요"),
  });
  const state = resolveBlockListState(blocked);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="차단한 사용자" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg px-5 pb-lg pt-md"
      >
        {state === "error" ? (
          <DexErrorState
            title="차단한 사용자를 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요"
            onRetry={blocked.refetch}
          />
        ) : state === "loading" ? (
          <View className="py-xl">
            <ActivityIndicator color={semantic.primary} />
          </View>
        ) : state === "empty" ? (
          <Text className="py-xl text-center text-fm-body text-foreground-muted">
            차단한 사용자가 없어요
          </Text>
        ) : (
          <View className="gap-sm">
            {blocked.items.map((item) => (
              <BlockedUserRow
                key={item.userId}
                item={item}
                // 진행 중인 행만 비활성 — 다른 행 연타는 in-flight 가드가 무시한다 (A7)
                unblocking={
                  unblock.isPending && unblock.variables?.userId === item.userId
                }
                onUnblock={() => unblock.mutate({ userId: item.userId })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* 해제 실패 안내 (기준 15) — 화면 하단 오버레이, 시트 밖이라 ActionToast 사용 가능 */}
      <ActionToast message={toast} onDismiss={() => setToast(null)} />
    </View>
  );
};
