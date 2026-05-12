type ButtonOwnProps = {
    loading?: boolean | React.ReactNode
    startIcon?: React.ReactNode
    endIcon?: React.ReactNode
    children?: React.ReactNode
}

export type ButtonProps = ButtonOwnProps & UseTwButtonProps & Omit<React.ComponentProps<'button'>, 'size'>

export type UseTwButtonProps = {
    color?: string;
    varient?: 'text' | 'contained' | 'outlined';
    size?: 'extra_small' | 'small' | 'medium' | 'large';
    rounded?: boolean | 'sm' | 'md' | 'lg' | 'full' | 'roundedSquare' | 'square' | 'circle'
}