import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

/**
 * 체크 형태 — 앱 전용 컴포넌트라 props 타입을 variants.ts가 아닌 여기(로컬)에 둔다
 * (Thumbnail의 ThumbnailShape 선례).
 * - circle: 26px 원 — 미체크는 아웃라인(흰 배경+테두리), 체크는 primary 필 + 흰 체크 (전체 동의 행)
 * - glyph: 체크 글리프 단독 (개별 약관 행)
 */
export type CheckboxVariant = "circle" | "glyph";

interface CheckboxBaseProps {
  /** 기본 "circle" */
  variant?: CheckboxVariant;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 접근 가능한 이름은 **타입으로 강제**한다 — 시각 라벨(label)이나 스크린리더 이름
 * (accessibilityLabel) 중 최소 하나가 없으면 컴파일되지 않는다. 라벨을 컨트롤 밖
 * (형제 Text·행 구성)에 두는 용법(주로 glyph)에서 이름 없는 checkbox가 새는 것을 막는다.
 */
type CheckboxNameProps =
  | {
      /** 체크 우측 라벨 — 이 값이 접근 가능한 이름도 겸한다 */
      label: string;
      /** 낭독 이름을 시각 라벨과 다르게 두고 싶을 때만 지정 */
      accessibilityLabel?: string;
    }
  | {
      /** 컨트롤만 렌더하는 용법 — 라벨을 밖에 두므로 이름을 여기서 준다 */
      label?: undefined;
      accessibilityLabel: string;
    };

type CheckboxProps = CheckboxBaseProps & CheckboxNameProps;

/**
 * SOURCE: Figma 회원가입 약관 동의 — check-all 14870:467(동의)·14870:430(미동의).
 * 컨트롤 + 라벨까지만 담당한다 — "보기" 링크·(필수) 표기 등 행 구성은 화면이 조립한다.
 * 미체크 원형은 Figma 정본대로 아웃라인 — 회색 필 + 흰 체크는 대비 1.4:1로 체크가 안 보인다.
 * 컨트롤이 26px(circle)·20px(glyph)로 작아 hitSlop 12로 터치 영역을 44px 이상 확보한다
 * (WCAG 2.5.8 최소 24px, 모바일 권장 44px).
 * `label`·`accessibilityLabel` 중 최소 하나는 필수다(CheckboxNameProps) — 이름 없는
 * checkbox는 타입 검사에서 막힌다.
 *
 * @example
 * <Checkbox checked={agreedAll} onChange={setAgreedAll} label="전체 동의" />
 * @example
 * // 라벨을 행에서 조립하는 용법 — 이름은 accessibilityLabel로 전달한다
 * <Checkbox variant="glyph" checked={agreed} onChange={setAgreed} accessibilityLabel="서비스 이용약관 동의" />
 */
export const Checkbox = ({
  variant = "circle",
  checked,
  onChange,
  label,
  accessibilityLabel,
  disabled,
  className,
}: CheckboxProps) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ checked, disabled: !!disabled }}
    disabled={disabled}
    hitSlop={12}
    onPress={() => onChange(!checked)}
    className={cx(
      "flex-row items-center gap-xs active:opacity-80",
      disabled && "opacity-50",
      className,
    )}
  >
    {variant === "circle" ? (
      <View
        className={cx(
          "size-6.5 items-center justify-center rounded-full",
          checked
            ? "bg-primary"
            : "border border-hairline-strong bg-background",
        )}
      >
        <Check
          size={14}
          strokeWidth={3}
          color={checked ? semantic.onPrimary : semantic.muted}
        />
      </View>
    ) : (
      <Check
        size={20}
        strokeWidth={2.5}
        color={checked ? semantic.primary : semantic.muted}
      />
    )}
    {label && (
      <Text
        className={cx(
          "text-fm-body",
          checked ? "text-foreground" : "text-foreground-body",
        )}
      >
        {label}
      </Text>
    )}
  </Pressable>
);
