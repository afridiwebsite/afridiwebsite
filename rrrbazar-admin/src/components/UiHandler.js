import React from 'react'
import { BiError } from 'react-icons/bi'
import { getErrors, hasData } from '../utils/handler.utils'
import Loader from './Loader/Loader'
import NotFound from './NotFound'
function UiHandler({ data, error, loading, absoluteLoader }) {
    const hastData = hasData(data)

    if (!hastData && !loading && !error)
        return <NotFound />
    if (loading)
        return <Loader absolute={absoluteLoader || hastData ? true : false} />
    if (error && !loading)
        return (
            <div className="flex flex-col items-center justify-center py-5 px-4 h-full">
                <div className="mb-2" >
                    <BiError className="w-12 h-12 text-red-600 md:w-14 md:h-14" />
                </div>
                <ul className="text-center" >
                    {getErrors(error, false, true)}
                </ul>
            </div>
        )

    return null;
}

export default UiHandler

