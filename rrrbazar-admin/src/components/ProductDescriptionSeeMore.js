import parse from 'html-react-parser'
import React, { useState } from 'react'

function ProductDescriptionSeeMore({ text, charLimit = 120 }) {
    const [expanded, setExpanded] = useState(false)
    const raw = typeof text === 'string' ? text : ''
    const isLong = raw.length > charLimit
    const visible = !isLong || expanded ? raw : raw.slice(0, charLimit) + '... '

    return (
        <div className="min-w-[250px] max-w-[280px] leading-6" style={{ whiteSpace: 'break-spaces' }}>
            {raw ? parse(visible) : '---'}
            {isLong && (
                <button
                    type="button"
                    className="text-blue-600 ml-1"
                    onClick={() => setExpanded((p) => !p)}
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    )
}

export default ProductDescriptionSeeMore
