import { Avatar as AvatarPrimitive } from "radix-ui";
import { cva } from "class-variance-authority";
import type { AvatarBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

/** SOURCE: Figma "FeelMap Avatar" (node 13430:714) — Size lg/md/sm = 48/36/28px */
const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full bg-surface",
  {
    variants: {
      size: {
        lg: "size-12",
        md: "size-9",
        sm: "size-7",
      },
    },
    defaultVariants: { size: "lg" },
  },
);

interface AvatarProps extends AvatarBaseProps {
  src?: string;
  alt?: string;
  /** 이미지 로드 실패/미지정 시 보여줄 짧은 텍스트 (예: 이니셜) */
  fallback?: string;
  className?: string;
}

/**
 * Radix Avatar 기반 (shadcn 패턴).
 *
 * @example
 * <Avatar src={user.profileUrl} alt={user.name} fallback="김" />
 * <Avatar size="sm" fallback="김" />
 */
export const Avatar = ({
  size,
  src,
  alt,
  fallback,
  className,
}: AvatarProps) => (
  <AvatarPrimitive.Root className={cn(avatarVariants({ size }), className)}>
    {src && (
      <AvatarPrimitive.Image
        src={src}
        alt={alt}
        className="size-full object-cover"
      />
    )}
    <AvatarPrimitive.Fallback className="flex size-full items-center justify-center text-fm-label text-foreground-muted">
      {fallback}
    </AvatarPrimitive.Fallback>
  </AvatarPrimitive.Root>
);
