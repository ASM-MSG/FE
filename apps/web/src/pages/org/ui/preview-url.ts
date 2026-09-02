/**
 * blob 미리보기 URL 해제 (codex 리뷰 P2, MSG-546) — 교체·실패·페이지 이탈 시 호출.
 * `blob:` 스킴만 해제한다 — MSG-550 수정 모드가 hydrate할 서버 이미지 URL(https:)을
 * 건드리면 안 된다. 플랫폼 API라 뷰 레이어(pages/org/ui)에 격리한다.
 */
export const revokeBlobPreviewUrl = (url: string | null): void => {
  if (url !== null && url.startsWith("blob:")) URL.revokeObjectURL(url);
};
