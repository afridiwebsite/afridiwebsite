import React from 'react'

function BlankLayout({children}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen" >
            {children}
        </div>
    )
}

export default BlankLayout
