import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";

/**
 * 콘솔 스텁 자리표시 (MSG-541) — 제목 텍스트만 렌더한다. 실구현은 각 후속 티켓
 * (MSG-542~554)이 자기 스텁 페이지 파일을 교체하며 채운다 — 라우트↔파일 1:1은 유지된다.
 * 제목이 곧 탭 제목("{제목} | 필맵")이다 (MSG-478 C3 관례).
 */
export const ConsoleStub = ({ title }: { title: string }) => {
  useDocumentTitle(formatDocumentTitle(title));

  return <h1 className="text-fm-display text-foreground">{title}</h1>;
};
