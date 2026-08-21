/** 배너 표시 형태 — cta(허용하기 진입점) · unsupported(조작 불가 안내) */
export type PermissionBannerMode = "cta" | "unsupported";

/**
 * 권한 배너 노출 파생 (MSG-409 AC 9·10) — 노출 정본은 408 토글 표시 정본과 동일
 * (`use-push-toggle`의 supported·checked). checked=false = 수신 불가(권한 미허용
 * 또는 FCM 미등록)면 배너를 띄우고, 미지원 브라우저는 CTA 없는 안내로 대체한다
 * (추정 3·4). 수신 가능(checked=true)이면 배너 없음.
 */
export const derivePermissionBanner = ({
  supported,
  checked,
}: {
  supported: boolean;
  checked: boolean;
}): PermissionBannerMode | null => {
  if (!supported) return "unsupported";
  return checked ? null : "cta";
};
