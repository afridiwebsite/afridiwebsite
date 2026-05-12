/*
 *
 * Title: FormikInputFile
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import { useFormikContext } from 'formik';
import { useMemo, useState } from 'react';
import FormikErrorMessage from './FormikErrorMessage';

function FormikInputFile({
  onChange,
  label,
  name,
  multiple,
  previewGridColums = 1,
  previewGridGap = 6,
  previewGridClassName,
  UploadingComponent,
  disabledPreview,
  disabledErrorMessage,
  ...props
}) {
  if (!name) throw new Error('name is required');

  const [filePaths, setFilePaths] = useState([]);
  const [files, setFiles] = useState([]);

  const { setFieldValue, errors, touched, setFieldTouched, isValid } =
    useFormikContext();

  const isError = errors[name] && touched[name];

  const hasOnChange = onChange && typeof onChange === 'function';

  // On Select File Handler
  const handleFile = (e) => {
    const selectedFiles = e.target.files;
    const allFiles = [
      ...(multiple && files.length > 0 ? files : []),
      ...selectedFiles,
    ];

    const paths = allFiles.map((file) => {
      return {
        url: URL.createObjectURL(file),
        type: file.type.split('/')[0],
      };
    });

    hasOnChange &&
      onChange({
        files: allFiles,
        paths: paths,
        e: e,
      });
    setFieldValue(name, allFiles);
    setFilePaths(paths);

    setFiles(allFiles);

    setTimeout(() => {
      e.target.value = '';
    }, 1000);
  };

  // Remove Single Files Handler
  const removeImage = (index) => {
    setFilePaths((prevPaths) => [...prevPaths.filter((_, i) => i !== index)]);
    setFiles((prevFiles) => {
      const filteredFiles = prevFiles.filter(
        (prevFile, i) => i !== index && prevFile
      );
      hasOnChange &&
        onChange({
          files: filteredFiles,
          paths: filePaths,
          e: undefined,
        });
      setFieldValue(name, filteredFiles);

      return filteredFiles;
    });
  };

  // Remove All Files Handler
  const removeAllHandler = () => {
    setFiles([]);
    setFilePaths([]);
    setFieldValue(name, []);
    hasOnChange &&
      onChange({
        files: [],
        paths: [],
        e: undefined,
      });
  };

  return (
    <div className="mb-4">
      {label && (
        <label
          className={`_subtitle2 block mb-1.5 ${isError ? 'text-red-500' : ''}`}
        >
          {label}
        </label>
      )}
      <div
        className={`rounded-md border relative overflow-hidden border-gray-300 ${
          isError ? '!border-red-500' : ''
        }`}
      >
        {/* Select File Placeholder ----Start---- */}
        <div className="relative">
          <input
            type="file"
            id={name}
            onBlur={() => setFieldTouched(name)}
            onChange={handleFile}
            multiple={multiple}
            // accept="image/*"
            className="opacity-0 _absolute_full z-10 cursor-pointer"
            {...props}
          />
          {(files.length === 0 || multiple) && (
            <>
              <label
                htmlFor={name}
                className={`relative _input border-0 rounded-none w-full cursor-pointer flex justify-center items-center ${
                  files.length > 0 ? '!border-b border-gray-300' : ''
                }`}
              >
                <div className="w-6 h-6 p-0.5 mr-1.5 text-gray-700">
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path>
                  </svg>
                </div>
                <span>Upload File</span>
              </label>
            </>
          )}
        </div>
        {/* Select File Placeholder ----End---- */}

        {/* When Preview is disabled ----Start---- */}
        {disabledPreview && files.length > 0 && (
          <div className="flex flex-col items-start w-full px-3 py-2.5">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between w-full _subtitle1"
              >
                <span
                  className="mr-2 whitespace-nowrap"
                  style={{
                    '-webkit-line-clamp': '1',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    '-webkit-box-orient': 'vertical',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                  }}
                >
                  {file?.name}
                </span>
                <div
                  className="w-[18px] h-[18px] flex-shrink-0 relative z-10 overflow-hidden cursor-pointer _flex_center p-0.5  bg-gray-700 hover:scale-110 duration-100 rounded-full"
                  onClick={() => removeImage(index)}
                >
                  <svg
                    stroke="currentColor"
                    className="text-white w-full h-full"
                    fill="currentColor"
                    strokeWidth="0"
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="32"
                      d="M368 368L144 144m224 0L144 368"
                    ></path>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* When Preview is disabled ----End---- */}

        {/* Preview Files ----Start---- */}
        {files.length > 0 && !disabledPreview && (
          <div
            className={`grid overflow-hidden p-1.5 ${
              previewGridClassName || ''
            }`}
            style={{
              gap: previewGridGap,
              gridTemplateColumns: [...new Array(previewGridColums).keys()]
                .map((e) => `auto`)
                .join(' '),
            }}
          >
            {filePaths &&
              filePaths.map(({ type, url }, index) => (
                <div
                  className="relative rounded-md border border-gray-300 overflow-hidden _animate_slide_right_in"
                  key={index}
                >
                  {/* Remove Btn Start */}
                  <div
                    className="w-[22px] z-10 h-[22px] overflow-hidden absolute top-1 right-1 cursor-pointer _flex_center p-0.5  bg-black/60 hover:scale-110 duration-100 rounded-full"
                    onClick={() => removeImage(index)}
                  >
                    <svg
                      stroke="currentColor"
                      className="text-white w-full h-full"
                      fill="currentColor"
                      strokeWidth="0"
                      viewBox="0 0 512 512"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="32"
                        d="M368 368L144 144m224 0L144 368"
                      ></path>
                    </svg>
                  </div>
                  {/* Remove Btn End */}

                  {type === 'image' && (
                    <img
                      src={url}
                      alt="Img"
                      className="w-full h-auto select-none"
                    />
                  )}
                  {type === 'video' && (
                    <video
                      src={url}
                      className="w-full h-auto select-none"
                      controls
                    ></video>
                  )}
                  {type === 'audio' && <audio src={url} controls></audio>}
                </div>
              ))}
          </div>
        )}
        {/* Preview Files ----End---- */}

        {/* Uploading Component ----Start---- */}
        {UploadingComponent && UploadingComponent}
        {/* Uploading Component ----End---- */}

        {/* Remove And Add New Files ----Start---- */}
        {files.length > 0 && multiple && (
          <div className="flex items-center justify-between gap-3 flex-wrap px-1.5 py-1 border-t border-gray-300">
            <span className="_body2">Total {files.length}</span>
            <div className="flex flex-wrap gap-3">
              {/* Add more button start */}
              {files.length > 1 && (
                <button
                  type="button"
                  onClick={removeAllHandler}
                  className="_btn text small _flex_center text-xs rounded-[4px]"
                >
                  Remove All
                </button>
              )}
              <label
                htmlFor={name}
                className="_btn small _flex_center text-xs rounded-[4px] cursor-pointer"
              >
                Add new
              </label>
              {/* Add more button end */}
            </div>
          </div>
        )}
        {/* Remove And Add New Files ----End---- */}
      </div>
      {!disabledErrorMessage && <FormikErrorMessage name={name} />}
    </div>
  );
}

export default FormikInputFile;
