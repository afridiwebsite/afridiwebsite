import axios from "axios";
import { useEffect, useState } from "react";

// Auth is the httpOnly session cookie now (see common/axios.js) — send
// credentials, no Authorization header.
function useGet(urlToFetch, baseURL, refresh) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(false);

  useEffect(() => {
    if (!urlToFetch) return false;
    setLoading(true);
    setError(false)
    setTimeout(() => {
      axios({
        baseURL: baseURL || process.env.REACT_APP_API_ENDPOINT,
        timeout: 10000,
        withCredentials: true,
        method: "GET",
        url: urlToFetch
      }).then((res) => {
        const data = res.data.data || res.data
        setData(data);
        setLoading(false);
      })
        .catch((err) => {
          // A dead session returns 401 → bounce to login (mirrors the shared
          // axios instance's interceptor).
          if (err?.response?.status === 401) {
            try {
              localStorage.removeItem("user");
              sessionStorage.removeItem("user");
            } catch (e) { /* ignore */ }
            const loginUrl = (process.env.REACT_APP_ADMIN_BASENAME || "") + "/login";
            if (!String(window.location.pathname).endsWith("/login")) {
              // window.location.href = loginUrl;
            }
          }
          setError(err);
          setLoading(false);
        });
    }, 400);

  }, [urlToFetch, baseURL, refresh, localRefresh]);

  const triggerRefresh = () => setLocalRefresh(prev => !prev)

  return [data, loading, error, triggerRefresh];
}

export default useGet;
