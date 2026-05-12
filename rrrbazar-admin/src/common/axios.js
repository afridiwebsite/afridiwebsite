import axios from "axios";
import { getLocal, getSession } from "../utils/localStorage.utils";
const token = getLocal('token') || getSession('token')

const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_ENDPOINT,
    headers: {
        authorization: token
    }
});
export default axiosInstance;