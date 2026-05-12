import axios from 'axios';
import { body } from 'express-validator';
import validationHandler from './validationHandler';

import Schema from '../../models';
const {
    User
} = Schema;

const null_falsy = { checkFalsy: true, checkNull: true }

export const registerUserValidator = [
    body('username')
        .exists(null_falsy)
        .withMessage('Username is required')
        .custom((username) => {
            return User.findOne({
                where: {
                    username
                }
            }).then(user => {
                if (user) {
                    return Promise.reject('Username already in use');
                }
            });

        })
    ,
    body('gRecaptchaToken')
        .exists(null_falsy)
        .withMessage('Recaptcha is required')
        .custom(async (gRecaptchaToken) => {
            await axios.post("https://www.google.com/recaptcha/api/siteverify?secret=6LcmJigiAAAAAPNAyC1glHJpZIUtuAMgnaMVdSBr&response=" + gRecaptchaToken, {
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `secret=6LcmJigiAAAAAPNAyC1glHJpZIUtuAMgnaMVdSBr&response=${gRecaptchaToken}`,
              })
            .then((reCaptchaRes) => {
                if (reCaptchaRes?.data?.score > 0.5) {
                    return true;
                } else {
                    return Promise.reject('Google ReCaptcha Failure');
                }
            })
            .catch((error) => {
                throw new Error(error.response);
            })
        })
    ,
    body('email')
        .exists(null_falsy)
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Email must be an valid email address')
        .custom((email) => {
            return User.findOne({
                where: {
                    email
                }
            }).then(user => {
                if (user) {
                    return Promise.reject('E-mail already in use');
                }
            });
        }),
    body('phone').exists(null_falsy).withMessage('Phone number is required')
        .custom((phone) => {
            const bd_phone_regex = /(^(\+88|0088)?(01){1}[13456789]{1}(\d){8})$/
            if (!bd_phone_regex.test(phone)) throw new Error('Phone number must be an valid phone number')
            return true;
        }),
    body('password')
        .exists(null_falsy)
        .withMessage('Password is required')
        .notEmpty()
        .isLength({ min: 5 })
        .withMessage('Password must contain at least 5 characters'),
    body('confirm_password')
        .exists(null_falsy)
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }

            return true;
        }),
    validationHandler
];