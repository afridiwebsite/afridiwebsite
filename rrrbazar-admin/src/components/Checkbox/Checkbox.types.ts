import React from "react";
import { InputSizes } from "../Input/Input.types";

export type CheckboxTypes = {
    size?: InputSizes;
    indeterminate?: boolean;
    icon?: React.ReactNode;
    checkedIcon?: React.ReactNode;
    indeterminateIcon?: React.ReactNode;
    label?: React.ReactNode;
} & Omit<React.ComponentProps<'input'>, 'size'>