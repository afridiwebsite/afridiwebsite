import React, { useState } from 'react'
import { BsChevronUp } from 'react-icons/bs'

function PackagesAccordion({ children, title }) {
    const [toggleAccordion, setToggleAccordion] = useState(false)
    return (
        <>
            {/* Accordion --Start-- */}
            <div className="mb-4" >
                <div className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-3.5 cursor-pointer select-none" onClick={() => setToggleAccordion(!toggleAccordion)}>
                    <div className="flex-grow py-2">
                        <h5 className="h_5">{title}</h5>
                    </div>
                    <div className="flex items-center space-x-3" >
                        <div className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900">
                            <BsChevronUp className={`w-full h-full duration-200 ${!toggleAccordion && 'rotate-180'}`} />
                        </div>
                        {/* <VscClose className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900" /> */}
                    </div>
                </div>

                <div className={`border border-t-0 relative border-gray-200 px-3.5 py-3 ${toggleAccordion ? 'block' : 'hidden'}`} >
                    {children}
                </div>

            </div>
            {/* Accordion --End-- */}
        </>
    )
}

export default PackagesAccordion
