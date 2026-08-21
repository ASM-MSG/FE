/**
 * S3 직접 PUT 어댑터 (MSG-329 B10) — presigned URL 업로드는 **전역 fetch**로 수행한다.
 * 앱 httpClient(ky)를 타면 Authorization·X-Device-Id 헤더와 쿠키(credentials: include)가
 * 외부 S3 도메인으로 새므로 절대 경유하지 않는다 (선분석·확정 공통).
 */
export const uploadToS3 = async (
  uploadUrl: string,
  file: Blob,
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    // presign 발급 시 서명된 contentType과 일치해야 서명 검증을 통과한다
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!response.ok) {
    throw new Error(`S3 업로드 실패 (HTTP ${response.status})`);
  }
};
