import ReactLoader from "react-loader-spinner";
import React from 'react'

function Loader({ size = 40, absolute }) {
    return (
        <div className={`bg-blue-700 flex_center duration-100 ${absolute ? 'absolute_full' : 'py-8'}`} >
            <ReactLoader
                type="Bars"
                color="#fff"
                height={size}
                width={size}
            />
        </div>
    )
}

export default Loader
