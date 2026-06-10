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

// 401 = the session is missing / expired / revoked → drop the local UI hint
// and return to Not Permitted. 403 = authenticated but not permitted for that route;
// we now redirect both to the Not Permitted page at the root domain.
axiosInstance.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
            try {
                localStorage.removeItem("user");
                sessionStorage.removeItem("user");
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
            } catch (e) {
                /* storage unavailable — ignore */
            }
            if (window.location.pathname !== "/not-permitted" && window.location.pathname !== "/not-permitted/") {
                window.location.href = "/not-permitted";
            }
        }
        return Promise.reject(error);
    },
);

export default axiosInstance;
