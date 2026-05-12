/*
 *
 * Title: FormikRadio
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { Field, useFormikContext } from 'formik';
import FormikErrorMessage from './FormikErrorMessage';
function FormikRadio({
  indeterminate,
  className,
  name,
  value,
  label,
  disabledErrorMessage,
  ...props
}) {
  if (!name) throw new Error('name is required');
  if (!value) throw new Error('value is required');

  const { errors, touched } = useFormikContext();
  const isError = errors[name] && touched[name];

  return (
    <div className="flex-grow w-full">
      <Field
        type="radio"
        name={name}
        value={value}
        component={MyRadio}
        className={className}
        label={label}
        isError={isError}
        {...props}
      />
      {!disabledErrorMessage && <FormikErrorMessage name={name} />}
    </div>
  );
}

export default FormikRadio;

const MyRadio = ({ field, form, className, label, isError, ...props }) => (
  <label className={`flex items-center cursor-pointer ${className || ''}`}>
    <label
      className={`_radio bounce`}
      style={isError && { '--border': 'red', '--border-hover': 'red' }}
    >
      <input {...field} {...props} />
      <div className="radio_icon_wrapper">
        <svg
          stroke="currentColor"
          className="checked_svg"
          fill="#fff"
          strokeWidth="0"
          viewBox="0 0 8 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M0 8c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4z"
          ></path>
        </svg>
      </div>
    </label>
    {label && (
      <span
        className={`ml-3 inline-block _subtitle2 select-none leading-[14px] ${
          isError ? 'text-red-600' : ''
        }`}
      >
        {label}
      </span>
    )}
  </label>
);
