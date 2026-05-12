/*
 *
 * Title: FormikInput
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { Field, useFormikContext } from 'formik';
import FormikErrorMessage from './FormikErrorMessage';

function FormikInput({
  name,
  className,
  type = 'text',
  disabledErrorMessage,
  ...props
}) {
  const { errors, touched } = useFormikContext();
  if (!name) throw new Error('name is required');

  const isError = errors[name] && touched[name];

  return (
    <div>
      <Field
        name={name}
        type={type}
        {...props}
        className={className}
        isError={isError}
        component={MyInput}
      />
      {!disabledErrorMessage && <FormikErrorMessage name={name} />}
    </div>
  );
}

export default FormikInput;

const MyInput = ({
  field,
  form,
  className,
  label,
  isError,
  isTextArea,
  ...props
}) => (
  <label className="inline-block w-full">
    {label && (
      <label
        htmlFor={field.name}
        className={`_subtitle2 mb-1.5 block ${isError ? 'text-red-500' : ''}`}
      >
        {label}
      </label>
    )}
    {!isTextArea ? (
      <input
        id={field.name}
        className={`_input ${className || ''} ${
          isError ? '!border-red-500' : ''
        }`}
        {...field}
        {...props}
      />
    ) : (
      <textarea
        id={field.name}
        className={`_input ${className || ''} ${
          isError ? '!border-red-500' : ''
        }`}
        {...field}
        {...props}
      ></textarea>
    )}
  </label>
);
