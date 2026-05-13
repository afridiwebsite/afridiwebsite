require('dotenv').config();
import express from 'express';
import cors from 'cors';
import loggerMiddleware from './middleware/logger.middleware';
const HttpException = require('./utils/HttpException.utils');
const errorMiddleware = require('./middleware/error.middleware');
import userRouter from './routes/user.route';
import adminRoute from './routes/admin.route';
import uploadRoute from './routes/upload.route';
import authController from './controllers/auth.controller';
import adminController from './controllers/admin.controller';
import { registerUserValidator } from './middleware/validators/registerUserValidator';

const app = express();
app.use(loggerMiddleware);
app.use(cors());
// Express 5: use a regex catch-all instead of "*"
// @ts-ignore: Unreachable code error
app.options(/.*/, cors());

app.use(express.static('uploads'))
app.use(express.json());

const port = Number(process.env.PORT || 3005);

app.use(`/api/v1/`, userRouter);
app.use('/api/v1/', uploadRoute)
app.use(`/api/admin/`, adminRoute);
app.get('/api/admin/check-username/:username', adminController.checkUsername);

app.use('/api/admin/login', authController.adminLogin)

app.post('/api/v1/login', authController.userLogin)
app.post('/api/v1/register', registerUserValidator, authController.userRegistration)
app.post('/api/v1/google-login', authController.googleLogin)
app.post('/api/v1/google-signup', authController.googleSignup)

// 404 error
app.all(/.*/, (req, res, next) => {
    const err = new HttpException(404, 'Endpoint Not Found');
    next(err);
});

// Error middleware
app.use(errorMiddleware);

// starting the server
app.listen(port, () =>
    console.log(`🚀 Server running on port ${port}!`));


module.exports = app;