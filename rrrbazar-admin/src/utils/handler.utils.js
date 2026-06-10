import axios from 'axios';
import { getLocal, getSession, removeBoth } from '../utils/localStorage.utils';

// Login URL, honouring a secret admin URL prefix (router basename).
const LOGIN_URL = (process.env.REACT_APP_ADMIN_BASENAME || '') + '/login';

// The real authentication is the httpOnly session cookie, which JS can't
// read by design. `user` is only a non-sensitive UI hint persisted at login
// so the shell can render before the first API call; the server is always the
// source of truth (a stale hint just yields a 401 → redirect to login).
export const isAuth = () => {
    const isUser = getLocal('user') || getSession('user');
    if (isUser) {
        return { user: isUser };
    }
    return false;
}

export const logOut = (redirect = true) => {
    // Best-effort: tell the API to revoke this device's server session +
    // clear the cookie. Fire-and-forget so logout is instant even offline.
    try {
        axios.post(
            process.env.REACT_APP_API_ENDPOINT + '/admin/logout',
            {},
            { withCredentials: true },
        ).catch(() => { /* ignore — we clear locally regardless */ });
    } catch (e) {
        /* ignore */
    }
    removeBoth('user');
    removeBoth('token');
    if (redirect) window.location.href = LOGIN_URL;
    return true;
}

export const getErrors = (error, onlyArray, returnJSX) => {
    let errors;
    const errorData = error?.response?.data;

    if (errorData?.errors) {
        errors = errorData?.errors?.map(err => err.msg)
    } else if (errorData?.message) {
        errors = [errorData?.message]
    } else {
        errors = ['Something went wrong! Try again.']
    }

    if (onlyArray) return errors;

    const res = errors.map(err => {
        if (returnJSX) {
            return <li className="text-red-600 list-none">{err}</li>;
        }
        return `<li class='text-red-600 list-none'>${err}</li>`
    })

    return returnJSX ? <ul>{res}</ul> : res.join(' ');

}

export const hasData = (data, loading, error) => {
    if (loading || error) return false;
    return data && (Array.isArray(data) ? data.length > 0 : true) && (data.constructor === Object ? Object.keys(data).length > 0 : true) ? true : false;
}


export const toastDefault = {
    position: 'bottom-center',
    autoClose: 5000,
    hideProgressBar: true
}

export const imgPath = (path) => {
    return process.env.REACT_APP_IMAGE_ROOT + '/images/' + path
};


export const getFormattedForReactSelect = (arr) => {
    if (!Array.isArray(arr)) return false
    let finalArray = [];
    arr.forEach((each) => {
        finalArray.push({ value: each.id + "", label: each.name });
    });

    return finalArray;
};
export const formatOrderTableData = (data) => {
    let newData = data?.map(eachData => {
        let completed_by;
        if (eachData.Admin) {
            let admin = eachData?.Admin
            // completed_by = admin?.first_name + ' ' + admin?.last_name;
            completed_by = admin?.first_name;
        } else {
            completed_by = '- - -'
        }

        return { ...eachData, completed_by }
    })
    return newData
};
export const formatAddWalletTableData = (data) => {
    let newData = data?.map(eachData => {
        let payment_method_name;
        if (eachData.PaymentMethod) {
            let payment_method = eachData?.PaymentMethod
            payment_method_name = payment_method?.name;
        } else {
            payment_method_name = '- - -'
        }

        return { ...eachData, payment_method_name }
    })
    return newData
};
