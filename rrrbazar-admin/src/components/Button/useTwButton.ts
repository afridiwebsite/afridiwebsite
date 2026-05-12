import { useMemo } from "react";
import { UseTwButtonProps } from "./Button.types";

export const useTwButton = (options = {} as UseTwButtonProps): string => {

    const { varient = 'contained', color = 'blue', size = "medium", rounded = true } = options

    const getEqualPadding = useMemo(() => {
        const calcEqualSize =
            size === 'extra_small' ?
                '!w-[26.5px]' :
                size === 'small' ?
                    '!w-[32px]' :
                    size === 'large' ?
                        '!w-[46px]' :
                        '!w-[38px]'

        return `!p-0 !aspect-square ${calcEqualSize}`
    }, [size])

    const buttonSize =
        size === 'extra_small' ?
            'px-2 py-1 text-[11px] rounded-[3px]' :
            size === 'small' ?
                'px-[10px] py-1.5 text-[12px] rounded-[4px]' :
                size === 'large' ?
                    'px-4 py-2.5 text-base rounded-[6px]' :
                    'px-3 py-2 text-[14px] rounded-[6px] text-sm'


    const buttonRounded =
        rounded === 'sm' ?
            'rounded-sm' :
            (rounded === 'md' || rounded === true) ?
                'rounded-md' :
                rounded === 'lg' ?
                    'rounded-lg' :
                    rounded === 'full' ?
                        `rounded-full` :
                        rounded === 'roundedSquare' ?
                            `rounded-md ${getEqualPadding}` :
                            rounded === 'square' ?
                                `rounded-none ${getEqualPadding}` :
                                rounded === 'circle' ?
                                    `rounded-full ${getEqualPadding}` :
                                    '!rounded-none';

    return `_tw_btn ${varient} ${color} ${buttonSize} ${buttonRounded} duration-200 ease-in-out font-medium border outline-none no-underline select-none relative inline-block disabled:opacity-50 disabled:pointer-events-none active:opacity-60`;

}