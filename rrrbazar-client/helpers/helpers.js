/*
 *
 * Title: helpers
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { flash_message_key, __redirect_url_key } from '../config/globalConfig';
import { setSession } from '../lib/localStorage';

export const hasData = (data, loading, error) => {
  if (loading || error) return false;
  return data &&
    (Array.isArray(data) ? data.length > 0 : true) &&
    (data.constructor === Object ? Object.keys(data).length > 0 : true)
    ? true
    : false;
};

export const imgPath = (img_path) => {
  return process.env.NEXT_PUBLIC_Image_BASE_URL + '/images/' + img_path;
};

export const getErrors = (error) => {
  let errors = [];

  try {
    const errorData = error.response.data;
    if (errorData.errors) {
      errors = errorData.errors.map((err) => err.msg);
    } else {
      errors = [errorData.message];
    }
  } catch {
    errors.push('Something went wrong!');
  }

  return errors.length === 1 ? errors[0] : errors;
};

export const scrollTopWindow = () => {
  document.body.scrollTop = document.documentElement.scrollTop = 0;
};

export const setFlashMessage = (msg, msgKey) => {
  if (!msg) return;
  const message_key = msgKey || flash_message_key;
  setSession(message_key, msg);
};

export const bindRedirectQuery = (router) => {
  const hasRedirectQuery = router?.query?.[__redirect_url_key];

  return hasRedirectQuery ? `?${__redirect_url_key}=${hasRedirectQuery}` : '';
};

export const addRedirectQuery = (router) => {
  return `?${__redirect_url_key}=${router?.asPath}`;
};
