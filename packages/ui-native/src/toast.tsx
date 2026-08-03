import { Text, View } from "react-native";
import type { ReactNode } from "react";
import type { ToastBaseProps } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface ToastProps extends ToastBaseProps {
  title: string;
  description?: string;
  /** dark 스타일 좌측 아이콘 슬롯. 기본 "i" 원형 배지 */
  icon?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Toast" (node 13405:708) — 안내 배너 (다크/라이트).
 * 프레젠테이셔널 쉘 — 표시/사라짐 타이밍은 사용하는 쪽에서 제어한다.
 *
 * @example
 * <Toast title="업로드 전 최종 확인" description="AI 처리가 끝나면 ..." />
 * <Toast variant="light" title="AI 하이라이트 자동 추천" />
 */
export const Toast = ({
  variant = "dark",
  title,
  description,
  icon,
  className,
}: ToastProps) =>
  variant === "dark" ? (
    <View
      accessibilityLiveRegion="polite"
      className={cx(
        "w-full flex-row items-start gap-sm rounded-lg bg-foreground py-3.5 pl-3.5 pr-md shadow-toast",
        className,
      )}
    >
      <View className="size-7.5 items-center justify-center overflow-hidden rounded-full bg-primary">
        {typeof icon === "string" || icon === undefined ? (
          <Text className="text-fm-base font-semibold text-primary-foreground">
            {icon ?? "i"}
          </Text>
        ) : (
          icon
        )}
      </View>
      <View className="flex-1 gap-0.75">
        <Text className="text-fm-base font-semibold text-foreground-inverse">
          {title}
        </Text>
        {description && (
          <Text className="text-fm-label font-normal text-foreground-inverse/65">
            {description}
          </Text>
        )}
      </View>
    </View>
  ) : (
    <View
      accessibilityLiveRegion="polite"
      className={cx(
        "w-full items-start gap-xxs rounded-md bg-surface-soft px-md py-sm",
        className,
      )}
    >
      <Text className="text-fm-body-strong text-foreground">{title}</Text>
      {description && (
        <Text className="text-fm-label font-normal text-foreground-muted">
          {description}
        </Text>
      )}
    </View>
  );
