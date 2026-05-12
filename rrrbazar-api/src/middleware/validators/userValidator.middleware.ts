import { body } from 'express-validator';
import validationHandler from './validationHandler';


export const withdrawEarnWalletSchema = [
    body('amount')
        .exists()
        .withMessage('Amount is required')
        .isInt()
        .withMessage('Amount must be an integer'),
    body('number')
        .exists()
        .withMessage('Number is required')
        .isLength({ min: 10 })
        .withMessage('Number must be at least 10 chars long'),
    body('payment_method')
        .exists()
        .withMessage('Payment method is required')
        .isLength({ min: 1 })
        .withMessage('Payment method must be at least 1 chars long')
        .isString()
        .withMessage('Payment method must be a string'),
    validationHandler
]