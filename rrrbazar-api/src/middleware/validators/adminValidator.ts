import { body } from 'express-validator';
import validationHandler from './validationHandler';

export const createAdminValidator = [
    body('first_name')
        .exists()
        .withMessage('Name is required')
        .isLength({ min: 2 })
        .withMessage('Name must be at least 3 chars long'),
    body('last_name')
        .exists()
        .withMessage('Name is required')
        .isLength({ min: 3 })
        .withMessage('Name must be at least 3 chars long'),
    body('email')
        .exists()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Input Must be email'),
    body('username')
        .exists()
        .withMessage('Username is required')
        .isLength({ min: 3 })
        .withMessage('userame must be at least 3 chars long'),
    body('password')
        .exists()
        .withMessage('Password is required')
        .notEmpty()
        .isLength({ min: 5 })
        .withMessage('Password must contain at least 5 characters'),
    body('confirm_password')
        .exists()
        .custom((value, { req }) => value === req.body.password)
        .withMessage('confirm_password field must have the same value as the password field'),
    validationHandler
];
