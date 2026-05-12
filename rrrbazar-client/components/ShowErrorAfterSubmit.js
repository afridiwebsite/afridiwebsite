/*
 *
 * Title: ShowErrorAfterSubmit
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { hasData } from '../helpers/helpers';
import Alert from './Alert';

function ShowErrorAfterSubmit({ errors, touched, initialValues, className }) {
  const errroLength = Object.keys(errors).length;
  return (
    <>
      {hasData(errors) &&
        Object.keys(touched).length === Object.keys(initialValues).length && (
          <Alert
            className={`mb-4 ${className || ''}`}
            type="error"
            title={`You have ${errroLength} error${
              errroLength > 1 ? 's' : ''
            }. Please check again
                          and resubmit your form`}
          />
        )}
    </>
  );
}

export default ShowErrorAfterSubmit;
