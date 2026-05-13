import { Request, Response, NextFunction } from 'express';

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const { method, originalUrl, url } = req;
    const timestamp = new Date().toISOString();
    
    // Immediate log to confirm middleware is reached
    console.log(`[${timestamp}] Incoming Request: ${method} ${originalUrl || url}`);

    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        console.log(`[${new Date().toISOString()}] Completed: ${method} ${originalUrl || url} ${statusCode} - ${duration}ms`);
    });
    
    next();
};

export default loggerMiddleware;
