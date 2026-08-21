import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";

/**
 * 시트 상세·요약 헤더 (MSG-427 A3·A4·B2·C4·E4) — Figma 실측 구성.
 * - 상세 4종(화면 2·4·6·8·9): `‹ + 제목 (+ 상태 pill) + ✕`
 * - 핫구역 요약(화면 1): `{동 이름} + 핫구역 배지 + 전체 보기 + ✕` (뒤로가기 없음)
 * - 목록 3종(화면 3·5·7)은 이 헤더를 쓰지 않는다 — `theme-badge-header`가 담당한다
 *
 * `onBack`·`onClose`를 주지 않으면 해당 버튼이 렌더되지 않는다 — 눌러도 아무 일이 없는
 * 버튼을 스크린리더에 노출하지 않기 위해 조건부 렌더로 둔다.
 */
const ICON_SIZE = 20;

interface SheetHeaderProps {
  title: string;
  /** 제목 오른쪽 슬롯 — 상태 pill·테마 배지 */
  badge?: ReactNode;
  /** 헤더 우측 보조 액션 — 핫구역 요약의 `전체 보기` */
  action?: ReactNode;
  /** 한 단계 위로 (A3) — 없으면 `‹`를 그리지 않는다 */
  onBack?: () => void;
  /** 테마 해제 (A4) — 없으면 `✕`를 그리지 않는다 */
  onClose?: () => void;
}

export const SheetHeader = ({
  title,
  badge,
  action,
  onBack,
  onClose,
}: SheetHeaderProps) => (
  <View className="flex-row items-center gap-xs">
    {onBack && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="이전 단계로"
        onPress={onBack}
        className="active:opacity-80"
      >
        <ChevronLeft size={ICON_SIZE} color={semantic.muted} />
      </Pressable>
    )}
    {/* min-w-0(flex-1 + numberOfLines): 긴 제목이 배지·버튼을 화면 밖으로 밀지 않게 한다 */}
    <Text numberOfLines={1} className="flex-1 text-fm-title text-foreground">
      {title}
    </Text>
    {badge}
    {action}
    {onClose && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="테마 닫기"
        onPress={onClose}
        className="active:opacity-80"
      >
        <X size={ICON_SIZE} color={semantic.muted} />
      </Pressable>
    )}
  </View>
);
