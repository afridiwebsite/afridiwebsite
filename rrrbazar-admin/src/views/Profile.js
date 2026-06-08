import React, { useState } from "react";
import Navbar from "../components/Navbars/AuthNavbar.js";
import Footer from "../components/Footers/Footer.js";
import useGet from "../hooks/useGet";
import axios from "../common/axios";
import { imgPath, toastDefault } from "../utils/handler.utils";
import { toast } from "react-toastify";
import { getLocal, getSession, setLocal, setSession } from "../utils/localStorage.utils";
import defaultTeamImage from "../assets/img/team-2-800x800.jpg";

export default function Profile() {
  const [data, loading, error, refresh] = useGet('admin/profile')
  const [uploading, setUploading] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    setUploading(true)
    try {
      const res = await axios.post('v1/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const fileName = res.data?.data?.image || res.data?.image
      if (!fileName) throw new Error('No image name returned')

      // Save profile after image upload
      await axios.post('admin/profile/update', { image: fileName })

      // Update local storage so header reflects changes
      const user = getLocal('user') || getSession('user')
      if (user && typeof user === 'object') {
        const updatedUser = { ...user, image: fileName }
        if (getLocal('user')) setLocal('user', updatedUser)
        else setSession('user', updatedUser)
      }

      toast.success('Profile image updated', toastDefault)
      refresh()
    } catch (err) {
      console.error('[Profile] Image upload failed:', err)
      toast.error('Image upload failed', toastDefault)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <div className="text-xl font-bold">Loading Profile...</div>
          </div>
      )
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="text-xl font-bold text-red-600">Error loading profile</div>
            <button onClick={refresh} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded">Retry</button>
        </div>
    )
  }

  const profileImg = data?.image ? imgPath(data.image) : (defaultTeamImage?.default || defaultTeamImage);

  return (
    <>
      <Navbar transparent />
      <main className="profile-page">
        <section className="relative block h-500-px">
          <div
            className="absolute top-0 w-full h-full bg-center bg-cover"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1499336315816-097655dcfbda?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=2710&q=80')",
            }}
          >
            <span
              id="blackOverlay"
              className="w-full h-full absolute opacity-50 bg-black"
            ></span>
          </div>
          <div
            className="top-auto bottom-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden h-70-px"
            style={{ transform: "translateZ(0)" }}
          >
            <svg
              className="absolute bottom-0 overflow-hidden"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              version="1.1"
              viewBox="0 0 2560 100"
              x="0"
              y="0"
            >
              <polygon
                className="text-blueGray-200 fill-current"
                points="2560 0 2560 100 0 100"
              ></polygon>
            </svg>
          </div>
        </section>
        <section className="relative py-16 bg-blueGray-200">
          <div className="container mx-auto px-4">
            <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-xl rounded-lg -mt-64">
              <div className="px-6">
                <div className="flex flex-wrap justify-center">
                  <div className="w-full lg:w-3/12 px-4 lg:order-2 flex justify-center">
                    <div className="relative group cursor-pointer h-32 w-32 -m-16 -ml-20 lg:-ml-16">
                      <img
                        alt="Admin Profile"
                        src={profileImg}
                        className="shadow-xl rounded-full h-32 w-32 object-cover align-middle border-none absolute inset-0 max-w-150-px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <label htmlFor="admin-profile-image" className="cursor-pointer text-white text-xs font-bold text-center w-full h-full flex items-center justify-center">
                            {uploading ? '...' : 'Change'}
                        </label>
                        <input id="admin-profile-image" type="file" className="hidden" onChange={handleImageChange} accept="image/*" disabled={uploading} />
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-4/12 px-4 lg:order-3 lg:text-right lg:self-center">
                    <div className="py-6 px-3 mt-32 sm:mt-0">
                      <button
                        className="bg-indigo-600 !text-white active:bg-indigo-700 uppercase font-bold hover:shadow-md shadow text-xs px-4 py-2 rounded outline-none focus:outline-none sm:mr-2 mb-1 ease-linear transition-all duration-150"
                        type="button"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                  <div className="w-full lg:w-4/12 px-4 lg:order-1">
                    <div className="flex justify-center py-4 lg:pt-4 pt-8">
                      <div className="mr-4 p-3 text-center">
                        <span className="text-xl font-bold block uppercase tracking-wide text-blueGray-600">
                          10
                        </span>
                        <span className="text-sm text-blueGray-400">
                          Photos
                        </span>
                      </div>
                      <div className="lg:mr-4 p-3 text-center">
                        <span className="text-xl font-bold block uppercase tracking-wide text-blueGray-600">
                          89
                        </span>
                        <span className="text-sm text-blueGray-400">
                          Comments
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-12">
                  <h3 className="text-4xl font-semibold leading-normal mb-2 text-blueGray-700 mb-2">
                    {data?.first_name || 'Admin'} {data?.last_name || ''}
                  </h3>
                  <div className="text-sm leading-normal mt-0 mb-2 text-blueGray-400 font-bold uppercase">
                    <i className="fas fa-map-marker-alt mr-2 text-lg text-blueGray-400"></i>{" "}
                    {data?.username || 'admin'}
                  </div>
                  <div className="mb-2 text-blueGray-600 mt-10">
                    <i className="fas fa-envelope mr-2 text-lg text-blueGray-400"></i>
                    {data?.email || ''}
                  </div>
                </div>
                <div className="mt-10 py-10 border-t border-blueGray-200 text-center">
                  <div className="flex flex-wrap justify-center">
                    <div className="w-full lg:w-9/12 px-4">
                      <p className="mb-4 text-lg leading-relaxed text-blueGray-700">
                        Welcome to your admin profile. Here you can see your current statistics and account information.
                      </p>
                      <a
                        href="#pablo"
                        className="font-normal text-lightBlue-500"
                        onClick={(e) => e.preventDefault()}
                      >
                        Show more
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
