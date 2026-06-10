import axios from "axios";

// Auth now rides on a Secure httpOnly session cookie set by the API at login,
// NOT a token in localStorage. The cookie is unreadable to page JS (so it
// can't be exfiltrated via XSS) and is revocable server-side. We therefore
// send credentials on every request and no longer attach an Authorization
// header.
const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_ENDPOINT,
    withCredentials: true,
});

// Respect a secret admin URL prefix (React Router basename) when bouncing to
// the login screen.
const LOGIN_URL = (process.env.REACT_APP_ADMIN_BASENAME || "") + "/login";

// 401 = the session is missing / expired / revoked → drop the local UI hint
// and return to login. 403 = authenticated but not permitted for that route;
// we deliberately do NOT log out on 403 (the caller surfaces the error).
axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            try {
                localStorage.removeItem("user");
                sessionStorage.removeItem("user");
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
            } catch (e) {
                /* storage unavailable — ignore */
            }
            if (!String(window.location.pathname).endsWith("/login")) {
                window.location.href = LOGIN_URL;
            }
        }
        return Promise.reject(error);
    },
);

export default axiosInstance;
