import axios from "axios";
import { useEffect, useState } from "react";
import { getLocal, getSession } from "../utils/localStorage.utils";
const token = getLocal('token') || getSession('token')


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
        headers: {
          authorization: token
        },
        method: "GET",
        url: urlToFetch
      }).then((res) => {
        const data = res.data.data || res.data
        setData(data);
        setLoading(false);
      })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    }, 400);

  }, [urlToFetch, baseURL, refresh, localRefresh]);

  const triggerRefresh = () => setLocalRefresh(prev => !prev)

  return [data, loading, error, triggerRefresh];
}

export default useGet;
