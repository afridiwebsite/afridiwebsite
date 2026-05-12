const { body } = require('express-validator');
import validationHandler from './validationHandler';

export const authModuleActiveValidator = [
    body('name')
        .exists()
        .withMessage('Name is required')
        .isLength({ min: 3 })
        .withMessage('Name must be at least 3 chars long'),
    body('slug')
        .exists()
        .withMessage('Slug is required')
        .isLength({ min: 3 })
        .withMessage('Slug must be at least 3 chars long').matches(/^[a-z0-9_]*$/).withMessage('Invalid slug url'),
    validationHandler
];

export const addPermissionValidator = [
    body('admin_id')
        .exists()
        .withMessage('Admin id is required'),
    body('auth_module_id')
        .exists()
        .withMessage('Auth Module id is required'),
    validationHandler
]

export const updateAdminAuthValidator = [
    body('admin_id')
        .exists()
        .withMessage('Admin id is required'),
    body('auth_ids')
        .exists()
        .withMessage('Auth Module id is required').isArray().withMessage('Auth Module ids must be an array'),
    validationHandler
]

export const updateTransactionRowValidator = [
    body('amount')
        .exists()
        .withMessage('Amount is required'),
    body('number')
        .exists()
        .withMessage('Phone number is required'),
    body('status')
        .exists()
        .withMessage('Status is required'),
    validationHandler
]

export const adminWalletRequestValidator = [
    body('amount')
        .exists()
        .withMessage('Amount is required'),
    validationHandler
]
