import { Pressable } from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "@fillmap/ui-native";

interface VideoMoreButtonProps {
  onPress: () => void;
  className?: string;
}

/**
 * 영상 더보기(⋯) 트리거 (MSG-431 S1·S11) — 도감 갤러리 카드 썸네일 우상단과 격자 상세
 * 영상 행 우측 두 곳이 쓴다(두 번째 사용처가 있어 화면 로컬이 아니라 feature ui에 둔다).
 *
 * **Figma에는 이 트리거가 없다** — 두 정본 프레임 모두 시트/다이얼로그가 카드를 가린
 * 상태로만 그려져 있다(스펙 Q3). 자리·모양은 웹 MSG-411(썸네일 우상단 반투명 원형 +
 * `MoreHorizontal`)을 따르되 크기를 `size-9`(36dp)로 키웠고, `hitSlop` 4로 유효 터치
 * 영역을 44dp로 맞춘다(MSG-420·425 실기 환류의 38dp 미달 지적 반영).
 *
 * `ui-native` 승격 대상이 아니다 — 배경 딤·아이콘 조합이 영상 카드 문맥 전용이고,
 * `index.ts` diff 0줄 합의(MSG-420)도 유지한다.
 */
export const VideoMoreButton = ({
  onPress,
  className,
}: VideoMoreButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="영상 더보기"
    hitSlop={4}
    onPress={onPress}
    className={cx(
      "size-9 items-center justify-center rounded-full bg-navy-900/40 active:opacity-60",
      className,
    )}
  >
    <MoreHorizontal size={18} color={semantic.textInverse} />
  </Pressable>
);
