import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Thumbnail } from "@fillmap/ui-web";

/**
 * ui-web Thumbnail 폴백 계약 스모크 (MSG-464 기준 3·4·5) — "src 유효 시 이미지 렌더,
 * null·빈 문자열·로드 에러 시 이미지 제거(기본 이미지 폴백 전환), src 변경 시 에러
 * 리셋" 계약만 고정한다. 폴백 그래픽(격자 로고 마크)의 외관 자체는 화면 기준(7)으로
 * 브라우저 검증 몫이다. ui-web에 테스트 인프라가 없어 apps/web에 둔다
 * (ui-web-cn.test.ts 선례).
 */
describe("ui-web Thumbnail 폴백 계약 (MSG-464)", () => {
  afterEach(() => {
    cleanup();
  });

  it("src가 있으면 썸네일 이미지가 렌더된다", () => {
    render(<Thumbnail src="data:,thumb" alt="영상 썸네일" />);

    expect(screen.getByRole("img", { name: "영상 썸네일" })).toBeTruthy();
  });

  it("src가 null이면 기본 이미지 폴백으로 전환된다 — 이미지 요소가 렌더되지 않는다 (기준 3)", () => {
    render(<Thumbnail src={null} alt="영상 썸네일" />);

    expect(screen.queryByRole("img", { name: "영상 썸네일" })).toBeNull();
  });

  it("src가 빈 문자열이어도 폴백으로 전환된다 — 현재 페이지 재요청 함정 차단 (추정 4)", () => {
    render(<Thumbnail src="" alt="영상 썸네일" />);

    expect(screen.queryByRole("img", { name: "영상 썸네일" })).toBeNull();
  });

  it("이미지 로드가 실패하면(onError) 같은 기본 이미지로 대체된다 — 깨진 이미지가 남지 않는다 (기준 4)", () => {
    render(
      <Thumbnail src="https://invalid.example/thumb.jpg" alt="영상 썸네일" />,
    );

    fireEvent.error(screen.getByRole("img", { name: "영상 썸네일" }));

    expect(screen.queryByRole("img", { name: "영상 썸네일" })).toBeNull();
  });

  it("src가 다른 값으로 바뀌면 에러 상태가 리셋되어 새 이미지를 다시 시도한다 (기준 5)", () => {
    const { rerender } = render(<Thumbnail src="data:,a" alt="영상 썸네일" />);
    fireEvent.error(screen.getByRole("img", { name: "영상 썸네일" }));

    rerender(<Thumbnail src="data:,b" alt="영상 썸네일" />);

    expect(
      screen.getByRole("img", { name: "영상 썸네일" }).getAttribute("src"),
    ).toBe("data:,b");
  });
});
