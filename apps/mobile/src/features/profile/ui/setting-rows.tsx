import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Switch, cx } from "@fillmap/ui-native";

/**
 * SOURCE: Figma "프로필/설정" 설정-rows(14816:485)·계정-rows(14816:504) — MSG-426 기준 1·7·8.
 * 행 컨테이너에 카드 배경·테두리가 없다(label + spacer + right 3요소뿐) — 구 MSG-306의
 * `rounded-md border border-border bg-surface-soft` 카드 행이 기준 1이 지적하는 어긋남이다.
 *
 * ui-web에도 대응물이 웹 `pages/profile/ui/SettingRow.tsx` **로컬**로 있어 승격하지 않는다
 * (프로필 설정 도메인 소속). 신규 ui-native 컴포넌트를 만들 수 없는 제약(배럴 봉쇄, 스펙 R5)
 * 과도 일치한다.
 */

/** Figma의 `›`는 아이콘 자리표시 → lucide ChevronRight (MSG-306 확정 승계) */
const RowChevron = () => <ChevronRight size={16} color={semantic.muted} />;

/** label과 right 사이를 밀어내는 spacer — Figma 구조(flex-1 h-px)를 그대로 옮긴다 */
const RowSpacer = () => <View className="h-px flex-1" />;

interface SettingRowProps {
  label: string;
  /** 우측 캡션 — 상세 화면이 후속 티켓인 행의 "준비 중" (기준 1·7) */
  hint?: string;
  /** danger는 파괴적 행 — 밝은 배경 위 AA 대비를 만족하는 red-600 텍스트 (기준 8) */
  tone?: "default" | "danger";
  /** 미지정이면 비활성 행 — 탭해도 아무 일이 없음을 스크린리더에도 알린다 */
  onPress?: () => void;
}

/** › 행 (기준 1·7·8) — 비활성 행도 같은 시각을 유지하고 상태만 접근성으로 구분한다 */
export const SettingRow = ({
  label,
  hint,
  tone = "default",
  onPress,
}: SettingRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: onPress === undefined }}
    disabled={onPress === undefined}
    onPress={onPress}
    className="flex-row items-center gap-sm active:opacity-60"
  >
    <Text
      className={cx(
        "text-fm-body",
        tone === "danger" ? "text-red-600" : "text-foreground",
      )}
      numberOfLines={1}
    >
      {label}
    </Text>
    <RowSpacer />
    <View className="flex-row items-center gap-1.5">
      {hint !== undefined && (
        <Text className="text-fm-label text-foreground-muted">{hint}</Text>
      )}
      <RowChevron />
    </View>
  </Pressable>
);

/** 정보 행 (기준 7) — 우측에 값 텍스트만, › 없음 (앱 버전 전용). 탭 대상이 아니다 */
export const SettingInfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View className="flex-row items-center gap-sm">
    <Text className="text-fm-body text-foreground" numberOfLines={1}>
      {label}
    </Text>
    <RowSpacer />
    <Text className="text-fm-label text-foreground-body">{value}</Text>
  </View>
);

interface SettingToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 저장 왕복 중 — 스위치를 잠가 연타 가드(기준 6)의 시각적 이중 안전망이 된다 */
  busy?: boolean;
  /** 저장 실패 안내 — 행 바로 아래 인라인 캡션 (기준 5, 스펙 Q2 결정) */
  errorText?: string;
}

/** 토글 행 (기준 1·5) — 우측이 Switch고, 실패하면 아래에 사유 캡션이 붙는다 */
export const SettingToggleRow = ({
  label,
  checked,
  onCheckedChange,
  busy,
  errorText,
}: SettingToggleRowProps) => (
  <View className="gap-xxs">
    <View className="flex-row items-center gap-sm">
      <Text className="text-fm-body text-foreground" numberOfLines={1}>
        {label}
      </Text>
      <RowSpacer />
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={busy}
        accessibilityLabel={label}
      />
    </View>
    {errorText !== undefined && (
      // 신규 토스트 인프라 없이 기준 5를 충족한다 — 화면에 남는 안내라 live region으로 알린다
      <Text
        accessibilityLiveRegion="polite"
        className="text-fm-caption text-red-600"
      >
        {errorText}
      </Text>
    )}
  </View>
);
