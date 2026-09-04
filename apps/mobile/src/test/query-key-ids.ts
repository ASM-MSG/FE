/**
 * 테스트 전용 헬퍼 — `queryClient.invalidateQueries` 스파이 호출에 실린 생성 쿼리 키의
 * 식별자(`_id`)들. 무효화 **집합**을 단정하는 테스트가 셋(settle-upload-success·
 * invalidate-upload-surfaces·start-ready-refresh)이라 공용으로 둔다 (MSG-567).
 */
export const invalidatedIds = (calls: unknown[][]): (string | undefined)[] =>
  calls.flatMap((call) => {
    const filters = call[0] as { queryKey?: { _id?: string }[] } | undefined;
    return (filters?.queryKey ?? []).map((key) => key._id);
  });
