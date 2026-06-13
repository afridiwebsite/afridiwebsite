import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { imgPath, toastDefault } from "../../utils/handler.utils";

// Shared image picker used by the admin add/edit forms (product logo, package
// logo, banner, notice image). It:
//   - restricts the OS file picker to images (`accept="image/*"`) — a hint, so
//     we also hard-reject non-image selections in JS,
//   - shows a live thumbnail preview of the chosen file, falling back to the
//     already-saved image (`existing`) on edit screens.
// The parent still owns the upload: we just hand back the raw File via
// `onFileSelected` (the existing `useUpload` hook turns it into a stored path).
function ImageUpload({
  id,
  onFileSelected,
  existing,
  required = false,
  className = "form_input",
}) {
  const inputRef = useRef(null);
  // Object URL for the locally-selected file. Kept in state so we can revoke
  // the previous one and avoid leaking blobs as the admin re-picks.
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const previewSrc = objectUrl || (existing ? imgPath(existing) : "");

  const handleChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // `accept` only biases the picker, so enforce the image-only rule here.
    if (!String(file.type || "").startsWith("image/")) {
      toast.error("Please choose an image file.", toastDefault);
      e.target.value = "";
      return;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(URL.createObjectURL(file));
    onFileSelected(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        className={className}
        type="file"
        accept="image/*"
        required={required}
        onChange={handleChange}
      />
      {previewSrc && (
        <div className="mt-2 w-[200px] h-[200px]">
          <img
            src={previewSrc}
            alt="Preview"
            className="w-full h-full rounded border border-gray-200 object-contain bg-gray-50"
          />
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
