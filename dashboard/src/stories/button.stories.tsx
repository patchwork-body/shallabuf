import { Button } from "../components/ui/button";

export default {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
};

export const Basic = {
  args: {
    children: "Button text",
  },
};

export const Disabled = {
  args: {
    children: "Disabled button",
    disabled: true,
  },
};

export const Variants = {
  render: (args: React.ComponentProps<typeof Button>) => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button {...args} variant="default">
        Default
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
      <Button {...args} variant="outline">
        Outline
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
};

export const Sizes = {
  render: (args: React.ComponentProps<typeof Button>) => (
    <div style={{ display: "flex", gap: 8 }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="default">
        Default
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="icon">
        Icon
      </Button>
    </div>
  ),
};

export const CustomClass = {
  args: {
    children: "Custom class button",
    className: "text-red-500 border border-red-500",
  },
};
