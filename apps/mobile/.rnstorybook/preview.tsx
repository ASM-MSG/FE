import { ScrollView } from "react-native";
import type { Preview } from "@storybook/react-native";

const preview: Preview = {
  decorators: [
    (Story) => (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-md p-md"
      >
        <Story />
      </ScrollView>
    ),
  ],
};

export default preview;
