import { TextInput, View } from "react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button } from "@fillmap/ui-native";
import { MAX_ROUTE_TEXT_LENGTH } from "../model/route-request";

/**
 * 입력 카드 (Figma 15750:466·15751:448) — 멀티라인 입력 + 하단 액션 행.
 * ui-native `Input`은 h-12 단일행이라 카드 안에 넣으면 이중 테두리가 된다(§3-3).
 * 500자는 서버 계약 상한이라 `maxLength` 하드 컷으로 막는다 — 카운터는 두지 않는다 (S4).
 * 결과·에러 상태에서도 살아 있어 편집·재요청이 가능하다 (D4, 웹 동일).
 */
interface RouteInputCardProps {
  text: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  /** 포커스 시 시트를 full로 — 키보드가 카드를 가리지 않게 (D3) */
  onFocus: () => void;
  /** 제출 가능 여부 — 판정은 route-request.canSubmit(순수) 소유 */
  canSubmit: boolean;
  /** 버튼 문구 — 입력 대기 "동선 짜기" / 결과·실패 "다시 짜기" (로딩은 아래에서 덮는다) */
  submitLabel: string;
  loading: boolean;
}

export const RouteInputCard = ({
  text,
  onChange,
  onSubmit,
  onFocus,
  canSubmit,
  submitLabel,
  loading,
}: RouteInputCardProps) => (
  <View className="gap-sm rounded-md border border-border bg-surface-soft p-3.5">
    <TextInput
      accessibilityLabel="하고 싶은 일 한 문장"
      multiline
      numberOfLines={2}
      maxLength={MAX_ROUTE_TEXT_LENGTH}
      editable={!loading}
      value={text}
      onChangeText={onChange}
      onFocus={onFocus}
      placeholder={
        "하고 싶은 일을 적어 주세요\n예) 오늘 오후에 축제 보고 카페 들르기"
      }
      placeholderTextColor={semantic.muted}
      textAlignVertical="top"
      className="min-h-10 p-0 text-fm-base text-foreground"
    />
    <View className="flex-row items-center justify-between gap-sm">
      {/* [MSG-489 확장점] 출발지 상태 행 슬롯 — 지금은 null (Figma 15750:486은 489 몫) */}
      <View />
      {/* 로딩 중은 Figma 지정대로 primary 면 + 50% 불투명 + 흰 글자 — ui-native Button의
          disabled는 흰 면·muted 글자로 바뀌므로 disabled 대신 onPress를 떼고 opacity만 덮는다
          (빈 입력 비활성은 ui-native 기본). canSubmit이 이미 false라 제출 경로는 없다 */}
      <Button
        text={loading ? "짜는 중…" : submitLabel}
        variant="primary"
        size="sm"
        disabled={!loading && !canSubmit}
        className={loading ? "opacity-50" : undefined}
        onPress={loading ? undefined : onSubmit}
      />
    </View>
  </View>
);
