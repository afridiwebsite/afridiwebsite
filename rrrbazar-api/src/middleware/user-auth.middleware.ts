const jwt = require('jsonwebtoken')
import express from 'express';
import Schema from '../models';
import Response from '../utils/response.utils';
const {
    User
} = Schema;
const userAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const response = new Response()
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new Error("Access Denied")
        }

        const tokenData = jwt.decode(token)

        if (Date.now() >= tokenData.exp * 1000) {
            response.message = 'Token is expired';
            response.action = response.responseConst.logout
            return res.status(400).send(response.internalError)
        }

        const user = await User.findByPk(tokenData.user_id)

        if (!user) {
            throw new Error("Access Denied")
        }

        jwt.verify(token, process.env.JWT_SECRET)

        req.user = user;

        next();

    } catch (e) {
        console.log(e);
        response.status = 403;
        response.success = false;
        response.message = 'Access Denied'
        response.action = response.responseConst.logout
        return res.status(403).send(response.getResponse())
    }
}

export default userAuth;