function errorMiddleware(error, req, res, next) {
    let { status = 500, message, data } = error;

    console.error(`[${new Date().toISOString()}] [Error] ${req.method} ${req.originalUrl}`);
    console.error(`Status: ${status}, Message: ${message}`);
    
    if (error.stack) {
        console.error(`Stack: ${error.stack}`);
    }
    
    if (data) {
        console.error(`Data: ${JSON.stringify(data, null, 2)}`);
    }

    // If status code is 500 - change the message to Internal server error
    message = (status === 500 && !message) ? 'Internal server error' : message;

    const response = {
        type: 'error',
        status,
        message,
        ...(data && { data })
    }

    res.status(status).send(response);
}

module.exports = errorMiddleware;
/*
{
    type: 'error',
    status: 404,
    message: 'Not Found'
    data: {...} // optional
}
*/