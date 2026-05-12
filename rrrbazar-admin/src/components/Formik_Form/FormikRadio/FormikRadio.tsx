import { Field } from 'formik';
import Radio from '../../Radio';
import FormikErrorMessage from '../FormikErrorMessage';
import { FormikRadioProps } from './FormikRadio.types';
function FormikRadio({ disabledErrorMessage, ...props }: FormikRadioProps) {
    return (
        <div>
            <Field type='radio' {...props} component={MyRadio} />
            {!disabledErrorMessage && (
                <FormikErrorMessage fontSize={props.size} name={props.name} />
            )}
        </div>
    );
}

export default FormikRadio;

const MyRadio = ({ field, form, ...props }) => {
    const isError = form.errors[field.name] && form.touched[field.name];
    return (
        <Radio
            {...field}
            {...props}
            className={`${isError ? '!ring-1 !ring-red-200 border-red-500' : '-'}`}
        />
    );
};
