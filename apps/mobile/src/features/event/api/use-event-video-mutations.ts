import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCommentMutationOptions,
  toggleHelpfulMutationOptions,
} from "./event-video-mutations";

/**
 * 도움돼요·댓글 뮤테이션 훅 (MSG-562 D7) — 옵션 팩토리(`event-video-mutations`)의 얇은 배선.
 * 옵션은 매 렌더 새로 만들어져 콜백이 최신 클로저를 본다(useMutation.setOptions —
 * 진행 중 뮤테이션의 onSuccess도 갱신되므로 제출 videoId 대조가 성립한다).
 */
export const useToggleHelpful = (callbacks: {
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation(toggleHelpfulMutationOptions(queryClient, callbacks));
};

export const useCreateComment = (callbacks: {
  onCreated?: (videoId: number) => void;
  onError?: (error: unknown) => void;
}) => {
  const queryClient = useQueryClient();
  return useMutation(createCommentMutationOptions(queryClient, callbacks));
};
