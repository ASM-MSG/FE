import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingToggleRow } from "./SettingToggleRow";

/**
 * 설정 토글 행 스모크 (MSG-408 AC 4·8) — "라벨이 접근 가능한 이름인 switch +
 * onCheckedChange + 비활성 캡션" 계약만 고정. 상태 전이 로직은 use-push-toggle
 * 테스트가, 시각은 브라우저 검증이 커버.
 */
describe("설정 토글 행 (AC 4·8)", () => {
  afterEach(() => cleanup());

  it("라벨을 접근 가능한 이름으로 가진 switch가 렌더되고, 클릭 시 onCheckedChange가 반전값으로 불린다 (AC 4)", () => {
    const onCheckedChange = vi.fn();
    render(
      <SettingToggleRow
        label="알림 받기"
        checked={false}
        onCheckedChange={onCheckedChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "알림 받기" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("비활성이면 switch가 조작 불가이고 사유 캡션이 표시된다 (AC 8)", () => {
    const onCheckedChange = vi.fn();
    render(
      <SettingToggleRow
        label="알림 받기"
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
        disabledCaption="미지원 브라우저"
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "알림 받기" }));

    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(screen.getByText("미지원 브라우저")).toBeTruthy();
  });
});
