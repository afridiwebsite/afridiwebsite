const { body } = require('express-validator');
import validationHandler from './validationHandler';
const checkNullFalse = { checkNull: true, checkFalsy: true };

export const paymentmethodSchema = [
    body('name')
        .exists(checkNullFalse)
        .withMessage('Payment method name is required')
        .isLength({ min: 3 })
        .withMessage('Must be at least 3 chars long'),
    body('logo')
        .exists(checkNullFalse)
        .withMessage('Logo is required'),
    body('info')
        .exists(checkNullFalse)
        .withMessage('Payment method info is required'),
    body('status')
        .exists(checkNullFalse)
        .withMessage('Payment status is required'),
    validationHandler
];

export const noticeSchema = [
    // body('title')
    //     .exists(checkNullFalse)
    //     .withMessage('Title is required')
    //     .isLength({ min: 3 })
    //     .withMessage('Must be at least 3 chars long'),
    body('image')
        .exists(checkNullFalse)
        .withMessage('Image is required'),
    body('notice')
        .exists(checkNullFalse)
        .withMessage('Notice is required'),
    body('type')
        .optional()
        .isString()
        .withMessage('Type must be a string'),
    // body('template')
    //     .exists(checkNullFalse)
    //     .withMessage('Template is required'),
    validationHandler
];

export const bannerSchema = [
    body('banner')
        .exists(checkNullFalse)
        .withMessage('Banner is required'),
    body('note')
        .exists(checkNullFalse)
        .withMessage('Note is required'),
    body('link')
        .exists(checkNullFalse)
        .withMessage('Link is required'),
    validationHandler
];

export const physicalProductSchema = [
    body('name').exists(checkNullFalse).withMessage('Name is required'),
    body('image').exists(checkNullFalse).withMessage('Image is required'),
    body('sale_price').exists(checkNullFalse).withMessage('Sale price is required'),
    body('regular_price').exists(checkNullFalse).withMessage('Regular price is required'),
    // body('start_at').exists(checkNullFalse).withMessage('Start at is required'),
    // body('end_at').exists(checkNullFalse).withMessage('End at is required'),
    body('description').exists(checkNullFalse).withMessage('Description is required'),
    body('quantity').exists(checkNullFalse).withMessage('Quantity is required'),
    body('is_active').exists(checkNullFalse).withMessage('Is active is required'),
    validationHandler
];

export const topupProductSchema = [
    body('name').exists(checkNullFalse).withMessage('Name is required'),
    body('price').exists(checkNullFalse).withMessage('Price is required'),
    body('logo').exists(checkNullFalse).withMessage('Logo is required'),
    // body('start_at').exists(checkNullFalse).withMessage('Start at is required'),
    // body('end_at').exists(checkNullFalse).withMessage('End at is required'),
    body('rules').exists(checkNullFalse).withMessage('Rules is required'),
    // body('topuptype').exists(checkNullFalse).withMessage('Topup type is required'),
    validationHandler
];

export const topupPackageSchema = [
    body('product_id').exists(checkNullFalse).withMessage('TopupProduct id is required'),
    body('name').exists(checkNullFalse).withMessage('Name is required'),
    body('price').exists(checkNullFalse).withMessage('Sell price is required'),
    body('bprice').exists(checkNullFalse).withMessage('Buy price is required'),
    validationHandler
];

export const updateDollarSchema = [
    body('product_id').exists(checkNullFalse).withMessage('TopupProduct id is required'),
    body('dollar_rate').exists(checkNullFalse).withMessage('Dollar rate is required'),
    validationHandler
];


export const sendSmsSchema = [
    body('phones').exists(checkNullFalse).withMessage('Phones is required').isArray().withMessage('Phones must be an array'),
    body('message').exists(checkNullFalse).withMessage('Message is required'),
    validationHandler
];