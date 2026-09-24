import { Link, useParams } from "react-router-dom";
import {
  isTermsPlaceholder,
  resolveTermsDocument,
  TERMS_DOCUMENTS,
  TERMS_NOT_FOUND_DESCRIPTION,
  TERMS_NOT_FOUND_TITLE,
  TERMS_PLACEHOLDER_DESCRIPTION,
  TERMS_PLACEHOLDER_TITLE,
} from "@fillmap/terms";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";

/**
 * 약관·개인정보 처리방침 공개 페이지 (MSG-606 H2) — 비로그인·지도 셸 밖의 정적 문서 페이지.
 * 앱스토어 심사(App Store Connect Privacy Policy URL)와 앱 로그인 화면 링크가 가리키는 주소다.
 * 본문은 `@fillmap/terms`가 정본이라 앱 뷰어와 같은 문구를 그린다. 평문이라 `whitespace-pre-wrap`.
 */
export const TermsPage = () => {
  const { docKey = "" } = useParams<{ docKey: string }>();
  const doc = resolveTermsDocument(docKey);
  useDocumentTitle(formatDocumentTitle(doc?.title ?? TERMS_NOT_FOUND_TITLE));

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-6 py-10 text-foreground">
      <header className="mb-8 flex flex-col gap-3">
        <Link to="/" className="text-sm text-foreground-muted hover:underline">
          ← 필맵 홈
        </Link>
        <h1 className="text-2xl font-bold">
          {doc?.title ?? TERMS_NOT_FOUND_TITLE}
        </h1>
        <nav
          aria-label="약관 문서"
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
        >
          {TERMS_DOCUMENTS.map((item) => (
            <Link
              key={item.key}
              to={`/terms/${item.key}`}
              aria-current={item.key === doc?.key ? "page" : undefined}
              className={
                item.key === doc?.key
                  ? "font-semibold text-primary"
                  : "text-foreground-muted hover:underline"
              }
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </header>
      {/* 모르는 키(문서 없음)와 문구 미확정(placeholder)은 다른 상태다 — 앱 뷰어(terms-document-view)와 같은 분기 */}
      {doc === null ? (
        <p className="text-foreground-muted">{TERMS_NOT_FOUND_DESCRIPTION}</p>
      ) : isTermsPlaceholder(doc) ? (
        <p className="text-foreground-muted">
          <strong className="block text-foreground">
            {TERMS_PLACEHOLDER_TITLE}
          </strong>
          {TERMS_PLACEHOLDER_DESCRIPTION}
        </p>
      ) : (
        <article className="whitespace-pre-wrap text-[15px] leading-7 text-foreground-body">
          {doc.body}
        </article>
      )}
    </main>
  );
};
