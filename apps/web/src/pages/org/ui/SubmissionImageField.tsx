import { useRef } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@fillmap/ui-web";
import { useSubmissionImageUpload } from "@/features/event-submission/api/use-submission-image-upload";
import {
  SUBMISSION_IMAGE_ACCEPT,
  SUBMISSION_IMAGE_HINT,
  submissionImageErrorMessage,
} from "@/features/event-submission/model/submission-image";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { revokeBlobPreviewUrl } from "./preview-url";

interface SubmissionImageFieldProps {
  /** 유형별 라벨 — "대표 이미지" / EVENT는 "커버 이미지" (AC 6) */
  label: string;
}

/**
 * 대표 이미지 입력 (AC 7·8 — Figma 4A~C 이미지 행).
 * 파일 선택 즉시 presign + S3 PUT을 실행하고(추정 8) 성공한 s3Key만 스토어에 보관한다.
 * 미리보기는 로컬 objectURL이며 플랫폼 API 사용은 이 뷰 파일에 격리된다(RN 경계).
 * 실패는 단계별 문구로 안내하고, 같은 버튼으로 즉시 재선택할 수 있다.
 */
export const SubmissionImageField = ({ label }: SubmissionImageFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const image = useSubmissionWizardStore((state) => state.image);
  const startImageUpload = useSubmissionWizardStore(
    (state) => state.startImageUpload,
  );
  const completeImageUpload = useSubmissionWizardStore(
    (state) => state.completeImageUpload,
  );
  const failImageUpload = useSubmissionWizardStore(
    (state) => state.failImageUpload,
  );
  const { mutate } = useSubmissionImageUpload();

  const handleFile = (file: File) => {
    // 교체 시 이전 blob, 실패 시(스토어가 미리보기를 비움) 방금 만든 blob을 해제한다
    // — 해제하지 않으면 10MB급 파일이 탭 수명 동안 누적된다 (codex 리뷰 P2)
    const previous = image.previewUrl;
    const next = URL.createObjectURL(file);
    startImageUpload(next);
    revokeBlobPreviewUrl(previous);
    // 스테일 정착 레이스는 react-query가 막는다: mutate의 per-call 콜백은 같은
    // observer에서 최신 호출만 발화하고(빠른 교체 — 이전 업로드의 늦은 정착 무시),
    // 관찰자 언마운트 시 버려진다(이탈 후 정착 — 새 세션 스토어 오염 없음).
    // 두 경로 모두 submission-image-revoke.test.tsx가 회귀로 고정한다 (codex 리뷰 P2 기각 근거)
    mutate(file, {
      onSuccess: completeImageUpload,
      onError: (error) => {
        failImageUpload(submissionImageErrorMessage(error));
        revokeBlobPreviewUrl(next);
      },
    });
  };

  return (
    <div className="flex flex-col gap-xs">
      <p className="text-fm-label text-foreground-body">{label}</p>
      <div className="flex gap-md">
        {image.previewUrl === null ? (
          <span className="flex h-30 w-52 items-center justify-center rounded-md bg-surface text-foreground-muted">
            <ImageIcon className="size-6" />
          </span>
        ) : (
          <img
            src={image.previewUrl}
            alt={`${label} 미리보기`}
            className="h-30 w-52 rounded-md object-cover"
          />
        )}
        <div className="flex flex-1 flex-col items-start justify-center gap-sm rounded-md border border-border p-md">
          <p className="text-fm-body text-foreground-muted">
            {SUBMISSION_IMAGE_HINT}
          </p>
          <Button
            text={
              image.status === "uploading"
                ? "업로드 중"
                : // 수정 모드는 s3Key 없이도 서버 이미지가 있다 — "선택"이 아니라 "변경"이다
                  image.s3Key === null && image.keptPreviewUrl === null
                  ? "이미지 선택"
                  : "이미지 변경"
            }
            variant="secondary"
            size="sm"
            disabled={image.status === "uploading"}
            onClick={() => inputRef.current?.click()}
            className="border border-border"
          />
          {image.errorMessage !== null && (
            <p role="alert" className="text-fm-body text-error">
              {image.errorMessage}
            </p>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={SUBMISSION_IMAGE_ACCEPT}
        aria-label={`${label} 파일 선택`}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) handleFile(file);
          // 같은 파일 재선택도 change가 발화하게 값을 비운다
          event.target.value = "";
        }}
      />
    </div>
  );
};
