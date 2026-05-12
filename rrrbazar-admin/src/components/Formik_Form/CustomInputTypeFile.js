import { useFormikContext } from "formik"
import { useEffect, useState } from "react"
import useUpload from "../../hooks/useUpload"
import { imgPath } from "../../utils/handler.utils"
import CircularProgress from "../Button/CircularProgress"
import { useTwInput } from "../Input/useTwInput"
import FormikErrorMessage from "./FormikErrorMessage"

function CustomInputTypeFile() {
    const [image, setImage] = useState(null)

    const inputStyles = useTwInput()
    const { path, uploading } = useUpload(image)
    const { setFieldValue, touched, errors, values } = useFormikContext()
    const prevValue = values['image'] && imgPath(values['image'])
    useEffect(() => {
        if (path) {
            setFieldValue('image', path)
        }
    }, [path])

    return (
        <div className="relative" >
            <label
                htmlFor="image"
                className={`text-slate-500 text-sm dark:text-slate-200 font-semibold mb-1 inline-block select-none`}
            >
                Image
            </label>
            <div className="relative flex items-center gap-1.5" >
                {uploading && <div className="absolute top-0 left-0 w-full h-full bg-white text-blue-600 rounded flex items-center justify-center text-sm border">
                    <CircularProgress size={20} />
                </div>}
                <input type="file" name="image" id="image" className={` ${touched['image'] && errors['image'] ? '!border-red-600' : ''} ${inputStyles}`} onChange={e => setImage(e.target.files[0])} />
                {prevValue && <div className="max-w-[50px] flex-shrink-0">
                    <img src={prevValue} />
                </div>}
            </div>
            <FormikErrorMessage name="image" />
        </div>
    )
}

export default CustomInputTypeFile
