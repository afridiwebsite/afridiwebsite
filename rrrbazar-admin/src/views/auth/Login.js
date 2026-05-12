import axios from "axios";
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import urljoin from "url-join";
import Alert from "../../components/Alert/Alert";
import Loader from "../../components/Loader/Loader";
import { setLocal, setSession } from "../../utils/localStorage.utils";

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [wrongCredential, setWrongCredential] = useState(false)
  const identityRef = useRef(null)
  const passwordRef = useRef(null)
  const rememberRef = useRef(null)

  const submitHandler = (e) => {
    e.preventDefault()
    const identity = identityRef.current.value
    const password = passwordRef.current.value
    const remember = rememberRef.current
    setLoading(true)
    setWrongCredential(false)

    axios.post(urljoin(process.env.REACT_APP_API_ENDPOINT, '/admin/login'), {
      identity,
      password,
      remember: remember.checked ? 1 : 0
    }).then(res => {
      if (remember.checked) {
        setLocal('user', res.data.data.user)
        setLocal('token', res.data.data.token)
      } else {
        setSession('user', res.data.data.user)
        setSession('token', res.data.data.token)
      }
      window.location.href = "/"
    }).catch(error => {
      setWrongCredential(true)
      setLoading(false)
      console.log(error)
    })
  }
  return (
    <>
      <div className="container mx-auto px-4 h-full">
        <div className="flex content-center items-center justify-center h-full">
          <div className="w-full sm:w-[70%] lg:w-[450px] px-4">
            <div className="relative overflow-hidden flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border border-gray-300 shadow-lg">
              {loading && <Loader absolute />}

              <div className="flex-auto px-4 lg:px-10 py-10 pt-0">
                <div className="text-blueGray-400 text-center mb-3 font-bold">
                  <small>Sign in</small>
                </div>
                {wrongCredential && <Alert text="Wrong email or password" />}
                <form onSubmit={submitHandler}>
                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="grid-password">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form_input"
                      placeholder="Email"
                      required
                      ref={identityRef}
                    />
                  </div>

                  <div className="relative w-full mb-3">
                    <label className="form_label" htmlFor="grid-password">
                      Password
                    </label>
                    <input
                      type="password"
                      className="form_input"
                      placeholder="Password"
                      required
                      ref={passwordRef}
                    />
                  </div>
                  <div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        id="customCheckLogin"
                        type="checkbox"
                        ref={rememberRef}
                        className="form-checkbox border-0 rounded text-blueGray-700 ml-1 w-5 h-5 ease-linear transition-all duration-150"
                      />
                      <span className="ml-2 text-sm font-semibold text-blueGray-600 select-none">
                        Remember me
                      </span>
                    </label>
                  </div>

                  <div className="text-center mt-6">
                    <button className="form_button" type="submit">
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="flex flex-wrap mt-6 relative">
              <div className="w-1/2">
                <a
                  href="#pablo"
                  onClick={(e) => e.preventDefault()}
                  className="text-blueGray-200"
                >
                  <small>Forgot password?</small>
                </a>
              </div>
              <div className="w-1/2 text-right">
                <Link to="/auth/register" className="text-blueGray-200">
                  <small>Create new account</small>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
