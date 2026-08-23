import { useLocalSearchParams, useRouter } from "expo-router";
import { TermsDocumentView } from "../../entities/terms/ui/terms-document-view";

/**
 * 약관 전문 라우트 (MSG-448 기준 5·6·7) — 문서 키만 다른 한 화면을 프로필 설정 2행과
 * 동의 관리 화면의 "보기"가 공유한다. 회원가입 동의 게이트는 이 라우트를 쓰지 않는다
 * (게이트가 `Stack` 자체를 대체하므로 `TermsDocumentView`를 직접 렌더한다).
 *
 * 모르는 키가 와도 화면 안에서 "문서를 찾을 수 없어요"로 처리한다 — 딥링크로 임의
 * 문자열이 들어와도 앱이 죽지 않는다 (기준 7).
 */
export default function TermsDocument() {
  const { docKey } = useLocalSearchParams<{ docKey: string }>();
  const router = useRouter();

  return <TermsDocumentView docKey={docKey} onClose={() => router.back()} />;
}
