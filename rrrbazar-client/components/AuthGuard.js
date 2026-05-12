/*
 *
 * Title: AuthGuard
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import routes from '../config/routes';
import { addRedirectQuery, setFlashMessage } from '../helpers/helpers';
import { globalContext } from '../pages/_app';
import CircularProgress from './CircularProgress';

function AuthGuard({
  children,
  rules,
  disabledRedirect,
  disabledFlashMessage,
}) {
  const router = useRouter();

  const { isAuth } = useContext(globalContext);
  const [showView, setShowView] = useState(false);

  const finalRules = rules !== undefined ? rules : isAuth;
  // Checking is authenticate
  useEffect(() => {
    if (!finalRules) {
      !disabledFlashMessage &&
        setFlashMessage('Please login to access this page');
      const redireactUrl = `${routes.login.name}${
        !disabledRedirect ? addRedirectQuery(router) : ''
      }`;
      router.push(redireactUrl).then(() => setShowView(true));
    } else {
      setShowView(true);
    }
  }, [finalRules, disabledFlashMessage]);

  if (!showView)
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="w-10 h-10">
          <CircularProgress className="text-primary-500" />
        </div>
      </div>
    );
  return children;
}

export default AuthGuard;
