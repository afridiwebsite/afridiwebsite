/*
 *
 * Title: FormikCheckBox
 * Description: --
 * Design & Develop: Saymon
 * Date: 24 November 2021 (Wednesday)
 *
 */

import { Field, useFormikContext } from 'formik';
import FormikErrorMessage from './FormikErrorMessage';
function FormikCheckBox({
  indeterminate,
  className,
  name,
  value,
  onChange,
  label,
  disabledErrorMessage,
  ...props
}) {
  if (!name) throw new Error('name is required');
  if (!value) throw new Error('value is required');

  const { errors, touched } = useFormikContext();
  const isError = errors[name] && touched[name];

  return (
    <div className="mb-4">
      <Field
        type="checkbox"
        name={name}
        value={value}
        component={MyCheckbox}
        className={className}
        label={label}
        isError={isError}
        {...props}
      />
      {!disabledErrorMessage && <FormikErrorMessage name={name} />}
    </div>
  );
}

export default FormikCheckBox;

const MyCheckbox = ({ field, form, className, label, isError, ...props }) => (
  <label className={`flex items-center cursor-pointer ${className || ''}`}>
    <label
      className={`_checkbox bounce`}
      style={isError && { '--border': 'red', '--border-hover': 'red' }}
    >
      <input {...field} {...props} />
      <div className="checkbox_icon_wrapper">
        <svg viewBox="0 0 21 21" className="checked_svg">
          <polyline points="5 10.75 8.5 14.25 16 6"></polyline>
        </svg>

        <svg
          viewBox="0 0 1024 1024"
          className="indeterminate_svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#fff"
            d="M904 476H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8z"
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
