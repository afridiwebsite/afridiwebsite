import React from "react";

// Shown on the pre-auth pages when the visitor did not arrive via the
// authorized external link. Deliberately offers no way to reach the form —
// the only path in is the access link.
export default function AccessDenied() {
  return (
    <div className="container mx-auto px-4 h-full">
      <div className="flex content-center items-center justify-center h-full">
        <div className="w-full sm:w-[70%] lg:w-[450px] px-4">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border border-gray-300">
            <div className="flex-auto px-6 py-10 text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <i className="fas fa-lock text-red-500 text-xl" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                Access restricted
              </h2>
              <p className="text-sm text-gray-500">
                This page can only be opened through your authorized access
                link. Please use the link provided to you to sign in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
