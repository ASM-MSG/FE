import { View } from "react-native";
import type { HomeMissions } from "../api/use-home-missions";
import { SheetHeader } from "./sheet-header";
import { SheetStatusView } from "./sheet-status-view";

/**
 * 상세 대상이 아직 없을 때의 자리 (MSG-427 A7 · P1 회귀 방지).
 *
 * `selectedMissionId`는 모듈 싱글턴이라 탭 왕복으로 화면이 재마운트돼도 살아남는데,
 * 그 직후에는 목록이 아직 비어 있고 래치도 새 인스턴스라 선택 뷰가 없다. 이때
 * **아무것도 렌더하지 않으면 안 된다** — 헤더(뒤로 `‹`·닫기 `✕`)가 상세 콘텐츠 컴포넌트
 * 안에 있으므로 빈 콘텐츠는 곧 **탈출 수단이 없는 빈 시트**다(Android 하드웨어 백만 남고
 * iOS에는 그마저 없다).
 *
 * 그래서 헤더를 먼저 그리고 그 아래에 로딩·실패를 구분해 보여준다.
 */
interface SheetDetailFallbackProps {
  missions: HomeMissions;
  onBack: () => void;
  /** 테마 해제 (A4) — 상세 4종이므로 항상 주어진다 */
  onClose?: () => void;
}

export const SheetDetailFallback = ({
  missions,
  onBack,
  onClose,
}: SheetDetailFallbackProps) => (
  <View className="flex-1 gap-sm">
    <SheetHeader title="미션" onBack={onBack} onClose={onClose} />
    <SheetStatusView
      state={missions.isError ? "error" : "loading"}
      errorText="미션을 불러오지 못했어요"
      onRetry={missions.retry}
    />
  </View>
);
