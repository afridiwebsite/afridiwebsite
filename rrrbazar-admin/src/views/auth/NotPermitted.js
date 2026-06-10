import React from "react";

// Shown when a user is unauthorized (401) or forbidden (403), or when
// they attempt to access the dashboard without a valid session.
export default function NotPermitted() {
  return (
    <div className="container mx-auto px-4 h-full h-screen">
      <div className="flex content-center items-center justify-center h-full">
        <div className="w-full sm:w-[70%] lg:w-[450px] px-4">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border border-gray-300">
            <div className="flex-auto px-6 py-10 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <i className="fas fa-ban text-red-500 text-xl" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Not permitted
              </h2>
              <p className="text-sm text-gray-500">
                You do not have permission to access this resource or your session has expired.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
