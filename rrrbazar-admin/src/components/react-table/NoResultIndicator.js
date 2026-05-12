import { BiSearchAlt } from "react-icons/bi"

function NoResultIndicator() {
    return (
        <div className="_s_no_result_indicator">
            <BiSearchAlt className="w-10 h-10 md:w-16 md:h-16" />
            <h4>No Result Found</h4>
        </div>
    )
}

export default NoResultIndicator
