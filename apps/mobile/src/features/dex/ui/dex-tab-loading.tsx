import { ActivityIndicator, View } from "react-native";
import { semantic } from "@fillmap/design-tokens";

/**
 * 탭 본문 조회 대기 표시 (S12) — 도착 전에 빈 진열장/빈 잔디를 그리지 않기 위한 자리다.
 * 뱃지 탭·기록 탭·1년 화면 셋이 같은 형태를 쓰므로 로컬 컴포넌트로 묶는다
 * (셸의 골격 로딩은 `dex-screen`이 따로 소유한다 — 이 티켓에서 그 파일은 무수정이다).
 */
export const DexTabLoading = () => (
  <View className="py-xl">
    <ActivityIndicator color={semantic.primary} />
  </View>
);
