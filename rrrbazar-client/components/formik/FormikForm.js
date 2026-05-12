/*
 *
 * Title: FormikForm
 * Description: All Formik Input Component Mush Be Wrap With This Component or Formik main "Formik" component
 * Design & Develop: Saymon
 * Date: 24 November 2021 (Wednesday)
 *
 */

import { Formik } from 'formik';
function FormikForm({
  initialValues,
  className,
  validationSchema,
  onSubmit,
  children,
}) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit && typeof onSubmit === 'function' && onSubmit}
    >
      {({ handleSubmit }) => (
        <>
          <form onSubmit={handleSubmit} className={className || ''}>
            {children}
          </form>
        </>
      )}
    </Formik>
  );
}

export default FormikForm;

// ({ handleSubmit }) => (
//     <>

//         <button type="submit" onClick={handleSubmit} >Submit</button>
//     </>
// )
