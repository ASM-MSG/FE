import { ActivityIndicator, Text, View } from "react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-native";
import type { SheetState } from "../model/home-sheet-state";

/**
 * 시트 콘텐츠의 로딩·빈 결과·실패 표시 (MSG-427 A7·A8) — 칩별 시트 5종 공용.
 *
 * 상태 판정은 model `deriveSheetState`가 하고 여기는 렌더만 한다 —
 * **실패 분기에 데이터 렌더 경로가 없다**(A8): `state`가 `list`가 아닐 때만 이 뷰가 뜨고,
 * 이 뷰는 어떤 데이터도 받지 않는다.
 */
interface SheetStatusViewProps {
  /** `list`면 아무것도 그리지 않는다 — 호출부가 목록을 그린다 */
  state: SheetState;
  /**
   * 빈 결과 문구 — 시트마다 다르다. **생략하면 빈 상태에서 아무것도 그리지 않는다**:
   * 핫구역 요약처럼 0건에도 다른 영역(액션 행·위치 줄)을 계속 보여야 하는 시트가 쓴다.
   */
  emptyText?: string;
  /** 실패 문구 — 시트마다 다르다 */
  errorText: string;
  onRetry: () => void;
}

export const SheetStatusView = ({
  state,
  emptyText,
  errorText,
  onRetry,
}: SheetStatusViewProps) => {
  if (state === "list") return null;

  return (
    <View className="flex-1 items-center justify-center gap-sm py-lg">
      {state === "loading" && <ActivityIndicator color={semantic.primary} />}
      {state === "empty" && emptyText !== undefined && (
        <Text className="text-fm-body text-foreground-muted">{emptyText}</Text>
      )}
      {state === "error" && (
        <>
          <Text className="text-fm-body text-foreground-muted">
            {errorText}
          </Text>
          {/* 시트 배경이 surface-elevated(흰색)라 secondary 버튼은 보이지 않는다 —
              채워진 primary로 둔다 (DefaultSheetContent와 같은 판단) */}
          <Button text="다시 시도" size="sm" onPress={onRetry} />
        </>
      )}
    </View>
  );
};
