const { body } = require('express-validator');
import validationHandler from './validationHandler'
const checkNullFalse = { checkNull: true, checkFalsy: true };

export const changePasswordSchema = [
    body('old_password')
        .exists(checkNullFalse)
        .withMessage('Old password is required'),
    body('new_password').trim()
        .exists(checkNullFalse)
        .withMessage('New password is required')
        .isLength({ min: 5 })
        .withMessage('Password must be at least 5 chars long'),
    body('confirm_password').trim()
        .exists(checkNullFalse)
        .withMessage('Confirm password is required'),
    validationHandler
];
