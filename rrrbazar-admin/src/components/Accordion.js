import { useState } from "react";
import { BsChevronUp } from "react-icons/bs"
import useGet from "../hooks/useGet";
import { hasData } from "../utils/handler.utils";
import Loader from "./Loader/Loader";
function Accordion({ product, setPackage, topupPackagesByAdmin }) {
    const [toggleAccordion, setToggleAccordion] = useState(false)
    const [packages, loading, error] = useGet(`admin/topup-packages/${product.id}`)
    const isChecked = (e) => {
        return topupPackagesByAdmin?.includes(e)
    }

    // useEffect(() => {
    //     if (packages?.length <= 0 && !loading) {
    //         setTimeout(() => {
    //             setToggleAccordion(false)
    //         }, 800);
    //     }
    // }, [packages, loading])

    const onchangeHandler = (e, id) => {
        if (e.target.checked) {
            setPackage(prev => [...prev, id])
        } else {
            setPackage(prev => {
                const remove = prev.filter(each => each !== id)
                return [...remove]
            })
        }
    }
    return (
        <>
            {/* Accordion --Start-- */}
            <div className="border-b border-gray-200 mb-3" >
                <div className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-3.5 cursor-pointer select-none" onClick={() => setToggleAccordion(!toggleAccordion)}>
                    <div className="flex-grow py-2">
                        <h5 className="h_5">{product.name}</h5>
                    </div>
                    <div className="flex items-center space-x-3" >
                        <div className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900">
                            <BsChevronUp className={`w-full h-full duration-200 ${!toggleAccordion && 'rotate-180'}`} />
                        </div>
                        {/* <VscClose className="w-5 h-5 cursor-pointer text-gray-500 hover:text-gray-900" /> */}
                    </div>
                </div>

                <div className={`border-t relative border-gray-200 px-3.5 py-3 ${toggleAccordion ? 'block' : 'hidden'}`} >
                    {
                        loading && <Loader wrapMinHeight="50px" size={30} />
                    }
                    {error && <p className="text-red-600 mt-4 text-base font-semibold" >Something went wrong</p>}

                    {Array.isArray(packages) && packages.length <= 0 && <p className="text-yellow-600 text-base font-semibold py-3 px-3.5" >There is no package under this product.</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" >
                        {hasData(packages, loading, error) && packages?.map((pack, i) => (
                            <label key={i} className="py-2 px-3 border border-gray-300 rounded flex items-center cursor-pointer hover:border-gray-600 duration-150 select-none group">
                                <input type="checkbox" onChange={(e) => onchangeHandler(e, pack.id)} defaultChecked={isChecked(pack.id)} />
                                <div className="ml-2" >
                                    <span className="text-base font-bold text-gray-600 group-hover:text-gray-800 duration-150" >{pack.name}</span>
                                    <p className="text-xs font-bold text-blue-600" >{pack.price} tk</p>
                                </div>

                            </label>
                        ))}
                    </div>
                </div>

            </div>
            {/* Accordion --End-- */}
        </>
    )
}

export default Accordion
