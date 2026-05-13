const jwt = require('jsonwebtoken')
import Response from '../utils/response.utils'
import Schema from '../models'
import express from 'express';
const {
    Admin,
    AuthModule,
    AdminAuth
} = Schema;
const auth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const response = new Response()
    try {
        const routeUrl = req.route.path;
        
        const authModule = await AuthModule.findOne({
            where: {
                auth_url: routeUrl,
                method: req.method.toUpperCase()
            }
        })

        const token = req.headers.authorization;
        if (!token) {
            throw new Error("Access Denied")
        }

        const tokenData = jwt.decode(token)
        //const admin = await Admin.findByPk(tokenData.user_id)
        const admin = await Admin.findOne({
            where: {
                id: tokenData.user_id,
                email: tokenData.user_email,
            }
        })
        if (!admin) {
            throw new Error("Access Denied")
        }


        const adminAuth = await AdminAuth.findOne({
            where: {
                auth_module_id: authModule?.id,
                admin_id: tokenData.user_id
            }
        })

        if (!adminAuth) {
            throw new Error("Access Denied")
        }

        if (Date.now() >= tokenData.exp * 1000) {
            response.message = 'Token is expired';
            return res.status(400).send(response)
        }

        jwt.verify(token, process.env.JWT_SECRET)

        req.admin = admin;

        next();

    } catch (e) {
        console.log("Admin Auth Error:", e);
        response.status = 403;
        response.success = false;
        response.message = 'Access Denied'
        return res.status(403).send(response.getResponse())
    }
}

export default auth;