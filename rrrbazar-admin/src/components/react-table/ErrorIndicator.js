function ErrorIndicator({ error, retryFunc }) {
    return (
        <div className='_s_table_error_indicator_wrapper'>
            <div className='_s_error_icon'>
                <svg
                    stroke='currentColor'
                    fill='currentColor'
                    strokeWidth='0'
                    viewBox='0 0 24 24'
                    xmlns='http://www.w3.org/2000/svg'
                >
                    <path d='M11.953 2C6.465 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.493 2 11.953 2zM12 20c-4.411 0-8-3.589-8-8s3.567-8 7.953-8C16.391 4 20 7.589 20 12s-3.589 8-8 8z'></path>
                    <path d='M11 7h2v7h-2zm0 8h2v2h-2z'></path>
                </svg>
            </div>
            <h3 className='_s_error_title'>{error || 'Something went wrong'}</h3>
            {/* <p className="_s_error_subtitle" >{error || 'Something went wrong'}</p> */}
            {retryFunc && typeof retryFunc === 'function' && (
                <button className='_s_try_again_btn' type='button' onClick={retryFunc}>
                    Try again
                </button>
            )}
        </div>
    );
}

export default ErrorIndicator;
