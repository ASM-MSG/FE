import type { ReactNode } from "react";
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
 *
 * [2026-09-25 리디자인] 행이 `SettingGroup` 흰 카드 안에 들어가면서 좌측 아이콘 원(`icon`)·
 * 카드 안 패딩·마지막 행 제외 구분선(`divider`)·알림함 미읽음 배지(`badgeCount`)가 생겼다.
 * 세 prop 모두 선택이라 종전 호출부는 그대로 동작한다.
 */

/** 행 좌측 아이콘 원 36px — 톤별 배경 (Figma row-icon) */
const RowIcon = ({
  icon,
  tone,
}: {
  icon: ReactNode;
  tone: "primary" | "danger" | "neutral";
}) => (
  <View
    className={cx(
      "size-9 items-center justify-center rounded-full",
      tone === "primary"
        ? "bg-primary/10"
        : tone === "danger"
          ? "bg-error/10"
          : "bg-surface",
    )}
  >
    {icon}
  </View>
);

/** 카드 안 행 공통 클래스 — 높이 56, 좌우 12 */
const ROW_CLASS = "flex-row items-center gap-sm px-sm py-2.5";

/** 행 아래 구분선 — 아이콘 폭(36)+간격(12)+패딩(12)만큼 들여 긋는다 */
const RowDivider = () => <View className="ml-15 h-px bg-surface" />;

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
  /** 좌측 아이콘 (lucide) — 그룹 카드 안 행 */
  icon?: ReactNode;
  /** 아이콘 원 톤 — 미지정이면 danger 행은 danger, 나머지 neutral */
  iconTone?: "primary" | "danger" | "neutral";
  /** 우측 빨간 숫자 배지 — 0 이하면 숨긴다 (알림함 미읽음) */
  badgeCount?: number;
  /** 카드 안에서 마지막 행이 아니면 아래 구분선 */
  divider?: boolean;
}

/** › 행 (기준 1·7·8) — 비활성 행도 같은 시각을 유지하고 상태만 접근성으로 구분한다 */
export const SettingRow = ({
  label,
  hint,
  tone = "default",
  onPress,
  icon,
  iconTone,
  badgeCount,
  divider = false,
}: SettingRowProps) => (
  <View>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: onPress === undefined }}
      disabled={onPress === undefined}
      onPress={onPress}
      className={cx(
        icon === undefined ? "flex-row items-center gap-sm" : ROW_CLASS,
        "active:opacity-60",
      )}
    >
      {icon !== undefined && (
        <RowIcon
          icon={icon}
          tone={iconTone ?? (tone === "danger" ? "danger" : "neutral")}
        />
      )}
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
        {badgeCount !== undefined && badgeCount > 0 && (
          <View className="min-w-6 items-center rounded-full bg-error px-1.5 py-0.5">
            <Text className="text-fm-caption font-semibold text-primary-foreground">
              {badgeCount > 99 ? "99+" : String(badgeCount)}
            </Text>
          </View>
        )}
        <RowChevron />
      </View>
    </Pressable>
    {divider && <RowDivider />}
  </View>
);

/** 정보 행 (기준 7) — 우측에 값 텍스트만, › 없음 (앱 버전 전용). 탭 대상이 아니다 */
export const SettingInfoRow = ({
  label,
  value,
  icon,
  divider = false,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  divider?: boolean;
}) => (
  <View>
    <View
      className={
        icon === undefined ? "flex-row items-center gap-sm" : ROW_CLASS
      }
    >
      {icon !== undefined && <RowIcon icon={icon} tone="neutral" />}
      <Text className="text-fm-body text-foreground" numberOfLines={1}>
        {label}
      </Text>
      <RowSpacer />
      <Text className="text-fm-label text-foreground-body">{value}</Text>
    </View>
    {divider && <RowDivider />}
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
  icon?: ReactNode;
  divider?: boolean;
}

/** 토글 행 (기준 1·5) — 우측이 Switch고, 실패하면 아래에 사유 캡션이 붙는다 */
export const SettingToggleRow = ({
  label,
  checked,
  onCheckedChange,
  busy,
  errorText,
  icon,
  divider = false,
}: SettingToggleRowProps) => (
  <View className={icon === undefined ? "gap-xxs" : undefined}>
    <View
      className={
        icon === undefined ? "flex-row items-center gap-sm" : ROW_CLASS
      }
    >
      {icon !== undefined && <RowIcon icon={icon} tone="primary" />}
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
        className={cx(
          "text-fm-caption text-red-600",
          icon !== undefined && "px-sm pb-xs",
        )}
      >
        {errorText}
      </Text>
    )}
    {divider && <RowDivider />}
  </View>
);
