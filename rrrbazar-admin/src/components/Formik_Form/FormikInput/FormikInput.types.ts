import { InputProps } from "./../../Input/Input.types";
export type FormikInputProps = {
    name: string;
    type: string;
    disabledErrorMessage?: boolean
} & InputProps