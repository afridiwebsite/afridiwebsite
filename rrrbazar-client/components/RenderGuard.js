/*
 *
 * Title: RenderGuard
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useState, useEffect, useContext } from 'react';
import { globalContext } from '/pages/_app';

function RenderGuard({ children }) {
  const { isAuth } = useContext(globalContext);
  const [showView, setShowView] = useState(false);

  useEffect(() => {
    isAuth && setShowView(true);
  }, [isAuth]);

  if (showView) return children;
  return null;
}

export default RenderGuard;
