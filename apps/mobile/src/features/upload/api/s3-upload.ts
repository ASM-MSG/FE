/**
 * S3 직접 PUT 어댑터 (기준 24) — presigned URL 업로드는 **전역 fetch**로 수행한다.
 * 앱 httpClient(ky)를 타면 Authorization·X-Client-Type 헤더가 외부 S3 도메인으로 새므로
 * 절대 경유하지 않는다 (웹 `api/s3-upload.ts`의 B10 원칙 그대로).
 *
 * 웹과 갈리는 지점은 파일 접근이다: 웹은 `File`을 그대로 바디로 싣지만 RN에는 File이 없어
 * picker가 준 파일 uri를 먼저 읽는다.
 *
 * **바디는 반드시 ArrayBuffer다 — Blob을 실으면 안 된다.**
 * 앱의 `globalThis.fetch`는 RN의 whatwg-fetch가 아니라 Expo가 갈아 끼운 native fetch이고
 * (`expo/src/winter/runtime.native.ts`), 그 `normalizeBodyInitAsync`가 body를 Blob으로 보면
 * `overriddenHeaders: [["Content-Type", body.type]]`을 돌려주며 `overrideHeaders`가
 * **호출자가 지정한 Content-Type을 지우고** blob 자신의 type으로 갈아 끼운다
 * (`expo/src/winter/fetch/RequestUtils.ts`). 로컬 파일 읽기 응답에는 content-type이 없어
 * 그 type이 빈 문자열이 되는데, presigned URL의 `X-Amz-SignedHeaders`가
 * `content-length;content-type;host`라 한 글자만 달라도 403 `SignatureDoesNotMatch`다.
 * 실제로 초기 구현이 이 경로로 **100% 실패**했다. ArrayBuffer 바디에는 그 override가 없어
 * 아래 헤더가 그대로 나간다.
 *
 * `expo-file-system` 스트리밍 업로드가 아니라 여기서 파일 전체를 메모리로 읽는 것은
 * 그대로다 — 500MB 상한을 선택 단계에서 먼저 거르는 이유다(R3, select-validation).
 */
export const uploadFileToS3 = async (
  uploadUrl: string,
  fileUri: string,
  contentType: string,
): Promise<void> => {
  // 로컬 파일 읽기도 fetch라 4xx/5xx에 reject하지 않는다 — ok를 보지 않으면 에러 응답
  // 본문(또는 0바이트)을 그대로 S3에 올리고 서버에는 정상 업로드로 기록된다.
  const file = await fetch(fileUri);
  if (!file.ok) {
    throw new Error(`영상 파일을 읽을 수 없어요 (HTTP ${file.status})`);
  }
  const bytes = await file.arrayBuffer();
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: bytes,
    // presign 발급 시 서명된 contentType과 일치해야 서명 검증을 통과한다
    headers: { "Content-Type": contentType },
  });
  if (!response.ok) {
    // 응답 본문을 함께 싣는다 — S3의 403 XML에는 SignatureDoesNotMatch·CanonicalRequest 등
    // 원인이 들어 있는데, 화면은 단계 문구로 덮어써 이 에러 메시지가 유일한 단서다
    const detail = await response.text().catch(() => "");
    throw new Error(
      `S3 업로드 실패 (HTTP ${response.status}) ${detail}`.trim(),
    );
  }
};
