import { Label } from "../components/ui/label";

export default {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
};

export const Basic = {
  args: {
    children: "Label text",
  },
};

export const Disabled = {
  args: {
    children: "Disabled label",
    "data-disabled": true,
  },
};

export const CustomClass = {
  args: {
    children: "Custom class label",
    className: "text-red-500",
  },
};
