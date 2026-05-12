const { body } = require('express-validator');
const validationHandler = require('./validationHandler')

export const loginSchema = [
    body('identity')
        .exists()
        .withMessage('Email or number is required')
        .isLength({ min: 3 })
        .withMessage('Must be at least 3 chars long'),
    body('password')
        .exists()
        .withMessage('Password is required')
        .isLength({ min: 2 })
        .withMessage('Must be at least 3 chars long'),
    body('remember')
        .optional(),
    validationHandler
];
