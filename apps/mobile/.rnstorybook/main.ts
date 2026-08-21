import type { StorybookConfig } from "@storybook/react-native";

const main: StorybookConfig = {
  stories: ["../../../packages/ui-native/src/**/*.stories.@(ts|tsx)"],
  deviceAddons: [],
};

export default main;
