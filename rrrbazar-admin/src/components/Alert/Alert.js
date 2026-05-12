function Alert({ text = "Alert text goes here", children }) {
    return (
        <div className="bg-red-100 border-l-4 border-red-600 rounded px-3 py-2.5 text-sm md:text-base text-red-600 my-2">
            {children || text}
        </div>
    )
}

export default Alert
