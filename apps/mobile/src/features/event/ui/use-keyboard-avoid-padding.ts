import { useEffect, useRef, useState } from "react";
import { Keyboard, type View } from "react-native";

/**
 * 시트 안 footer 입력창을 소프트 키보드 위로 올리는 하단 패딩 (MSG-562 R2).
 *
 * `KeyboardAvoidingView`를 쓰지 않는 이유: 그 컴포넌트는 `onLayout`의 **부모 기준** y로 겹침을 계산해
 * 시트(화면 중간에서 시작하는 컨테이너) 안에서는 시트 상단 오프셋만큼 덜 올라간다(실기 164px 부족).
 * edge-to-edge 앱이라 `adjustResize`도 창을 줄이지 않는다. 그래서 `measureInWindow`(창 절대 좌표)로
 * 루트 하단과 키보드 상단의 겹침을 직접 잰다.
 */
export const useKeyboardAvoidPadding = () => {
  const ref = useRef<View>(null);
  const [paddingBottom, setPaddingBottom] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      ref.current?.measureInWindow((_x, y, _width, height) => {
        setPaddingBottom(
          Math.max(0, y + height - event.endCoordinates.screenY),
        );
      });
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setPaddingBottom(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { ref, paddingBottom };
};
