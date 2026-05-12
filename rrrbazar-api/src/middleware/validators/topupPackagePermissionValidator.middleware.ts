const { body } = require('express-validator');
import validationHandler from './validationHandler'
const checkNullFalse = { checkNull: true, checkFalsy: true };


export const addTopupPackagePermissionSchema = [
    body('admin_id')
        .exists(checkNullFalse)
        .withMessage('Admin id is required'),
    body('topup_package_id')
        .exists(checkNullFalse)
        .withMessage('Topup package id is required')
        .isArray()
        .withMessage('Topup package must be an array'),
    validationHandler
];