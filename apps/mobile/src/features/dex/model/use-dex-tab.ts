import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { DEFAULT_DEX_TAB, parseDexTab, type DexTab } from "./dex-tab";

/**
 * 도감 탭 상태 + 딥링크 파라미터 (MSG-605) — `/dex?tab=badges&ts=…`로 오면 첫 진입은 초기값으로,
 * 이미 떠 있으면 요청마다(`ts`) 다시 적용한다. tab 값만 보면 사용자가 다른 탭으로 옮긴 뒤 같은
 * 뱃지 알림이 와도 effect가 안 돈다(codex P2). 화면에서 뗀 이유는 react-doctor 복잡도 상한.
 */
export const useDexTab = (): [
  DexTab,
  (next: DexTab | ((current: DexTab) => DexTab)) => void,
] => {
  const { tab: tabParam, ts: tsParam } = useLocalSearchParams<{
    tab?: string;
    ts?: string;
  }>();
  const [tab, setTab] = useState<DexTab>(
    () => parseDexTab(tabParam) ?? DEFAULT_DEX_TAB,
  );
  useEffect(() => {
    const next = parseDexTab(tabParam);
    if (next !== null) setTab(next);
  }, [tabParam, tsParam]);
  return [tab, setTab];
};
