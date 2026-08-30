import { Info } from "lucide-react";

/**
 * 결과 부족 배너 (Figma 15666:13416) — warning 12% 면 + 본문.
 * 문구는 FE 고정이고(partialBannerText) 서버 `notice` 문자열은 화면에 나타나지 않는다 (L4).
 */
interface RoutePartialBannerProps {
  text: string;
}

export const RoutePartialBanner = ({ text }: RoutePartialBannerProps) => (
  <div className="flex items-start gap-xs rounded-md bg-warning/12 p-sm">
    <Info className="mt-px size-4 shrink-0 text-warning" />
    <p className="text-fm-body text-foreground">{text}</p>
  </div>
);
