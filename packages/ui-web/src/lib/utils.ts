import { typography } from "@fillmap/design-tokens";
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge에 FeelMap 타이포 클래스를 폰트 크기로 알려준다 (MSG-395).
 *
 * `text-fm-*`는 tailwind-preset이 만든 커스텀 유틸이라 tailwind-merge가 이름만 보고
 * **색상**으로 분류한다. 그러면 같은 `cn()` 안에서 `text-fm-caption`과
 * `text-foreground-muted`가 한 그룹으로 충돌해 **앞엣것이 조용히 지워진다** —
 * 폰트 크기가 브라우저 기본(16px)으로 돌아가 배지·라벨이 커지는 실제 버그를 냈다.
 * (MSG-395 카드 높이가 Figma 87px 대신 107px로 나오던 원인)
 *
 * 크기와 색을 다른 그룹으로 갈라 두면 둘이 공존한다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: Object.keys(typography).map((variant) => `fm-${variant}`) },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
