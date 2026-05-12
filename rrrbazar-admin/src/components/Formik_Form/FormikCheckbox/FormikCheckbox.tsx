import { Field } from 'formik';
import Checkbox from '../../Checkbox';
import FormikErrorMessage from '../FormikErrorMessage';
import { FormikCheckboxProps } from './FormikCheckbox.types';
function FormikCheckbox({ disabledErrorMessage, ...props }: FormikCheckboxProps) {
    return (
        <div>
            <Field type='checkbox' {...props} component={MyCheckbox} />
            {!disabledErrorMessage && (
                <FormikErrorMessage name={props.name} fontSize={props.size} />
            )}
        </div>
    );
}

export default FormikCheckbox;

const MyCheckbox = ({ field, form, ...props }) => {
    const isError = form.errors[field.name] && form.touched[field.name];
    return (
        <Checkbox
            {...field}
            {...props}
            className={`${isError ? '!ring-1 !ring-red-200 border-red-500' : ''}`}
        />
    );
};
