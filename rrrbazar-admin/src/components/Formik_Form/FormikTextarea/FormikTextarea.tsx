import { Field } from 'formik';
import Textarea from '../../Textarea';
import FormikErrorMessage from '../FormikErrorMessage';
import { FormikTextareaProps } from './FormikTextarea.types';
function FormikTextarea({ disabledErrorMessage, ...props }: FormikTextareaProps) {
    return (
        <div>
            <Field {...props} component={MyTextarea} />
            {!disabledErrorMessage && (
                <FormikErrorMessage fontSize={props.size} name={props.name} />
            )}
        </div>
    );
}

export default FormikTextarea;

const MyTextarea = ({ field, form, ...props }) => {
    const isError = form.errors[field.name] && form.touched[field.name];
    return (
        <Textarea
            {...field}
            {...props}
            className={`${isError ? 'border-red-600 dark:border-red-600' : ''} ${
                props.className || ''
            }`}
            floatingLabelClass={`${
                isError ? '!text-red-500 peer-placeholder-shown:!text-slate-400' : ''
            } ${props.className || ''}`}
        />
    );
};
