import { InputSizes } from "../Input/Input.types";

export type RadioTypes = {
    size?: InputSizes;
    icon?: React.ReactNode;
    checkedIcon?: React.ReactNode;
    label?: React.ReactNode;
} & Omit<React.ComponentProps<'input'>, 'size'>