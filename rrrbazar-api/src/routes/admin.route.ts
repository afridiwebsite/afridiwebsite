import express from 'express';
import all_routes from 'express-list-endpoints';
import adminController from '../controllers/admin.controller';
import authController from '../controllers/auth.controller';
import bannerController from '../controllers/banner.controller';
import noticeController from '../controllers/notice.controller';
import paymentmethodController from '../controllers/paymentmethod.controller';
import physicalProductController from "../controllers/physicalProduct.controller";
import topuppackageController from '../controllers/topuppackage.controller';
import topupProductController from '../controllers/topupProduct.controller';
import userController from '../controllers/user.controller';
import categoryController from '../controllers/category.controller';
import siteSettingController from '../controllers/siteSetting.controller';
import spinController from '../controllers/spin.controller';
import auth from '../middleware/auth.middleware';
import { createAdminValidator } from '../middleware/validators/adminValidator';
import { addPermissionValidator, adminWalletRequestValidator, authModuleActiveValidator } from '../middleware/validators/authModuleValidator';
import { changePasswordSchema } from '../middleware/validators/changePasswordValidator';
import { bannerSchema, noticeSchema, paymentmethodSchema, sendSmsSchema } from '../middleware/validators/paymentMethodValidator';
import Schema from '../models';
import { updateAdminAuthValidator, updateTransactionRowValidator } from './../middleware/validators/authModuleValidator';
import { physicalProductSchema, topupPackageSchema, topupProductSchema, updateDollarSchema } from "./../middleware/validators/paymentMethodValidator";
import { addTopupPackagePermissionSchema } from './../middleware/validators/topupPackagePermissionValidator.middleware';
const { AuthModule } = Schema;
const router = express();

router.get('/publish-permission', auth, adminController.publishPermission)
//router.get('/mmdatab', authController.getTokenData)
router.get('/orders', auth, adminController.getOrders) // Get all orders
router.post('/order/update-order-status/:id', auth, adminController.updateOrderStatus) // Get all orders
router.get('/admins', auth, adminController.getAdmins) // Get all admins
router.post('/admin/delete/:id', auth, adminController.deleteAdmin) // Get all admins
router.get('/admin/:id', auth, adminController.getAdminById) // Get admin by id
router.get('/admin-auth/:id', auth, adminController.getAdminAuthById) // Get admin auth by admin id
router.get('/auth-modules', auth, adminController.getAuthModules) // Get all auths
router.get('/profile', auth, adminController.getAdminProfile)
router.post('/profile/update', auth, adminController.updateAdminProfile)
router.get('/get-uc-balance-sheet/:package_id', adminController.getUCBalanceSheet)

router.post('/auth-modules/active/:id', auth, authModuleActiveValidator, adminController.activeAuthModules)
router.post('/admin-auth/add-permission', auth, addPermissionValidator, adminController.addAdminPermission)
router.post('/topup-package-permission/add-permission', auth, addTopupPackagePermissionSchema, topuppackageController.addPermission)
router.get('/topup-package-permission/admin/:id', auth, topuppackageController.getTopupPackagePermissionByAdminId)
router.post('/admin-auth/update', auth, updateAdminAuthValidator, adminController.updateAdminAuth) // Update admin auth by admin id
router.get('/orders/admin-order', auth, adminController.getAdminOrders) // Get orders those are under a sub admin
router.post('/create-admin', auth, createAdminValidator, adminController.createNewAdmin); // Create new Admin

router.get('/transaction', auth, adminController.getAllTransaction)
router.get('/transaction/:id', auth, adminController.getTransactionById)
router.post('/transaction/update', auth, adminController.updateTransaction)
router.post('/transaction/update-full-row/:id', auth, updateTransactionRowValidator, adminController.updateTransactionFullRow)
router.post('/transaction/cancel-all', auth, adminController.cancelAllTransaction)

// -------- admin tranasaction
router.get('/admin-transaction', auth, adminController.getAllAdminTransaction)
router.get('/admin-transaction/:id', auth, adminController.getAdminTransactionById)
router.post('/admin-transaction/update', auth, adminController.updateAdminTransaction)
router.post('/admin-transaction/update-full-row/:id', auth, updateTransactionRowValidator, adminController.updateAdminTransactionFullRow)
router.post('/admin-transaction/request/transaction', auth, adminWalletRequestValidator, adminController.adminWalletRequest);
router.get('/profile/transactions', auth, adminController.getMyTransaction)
// -------- end admin transaction

router.get('/withdraw-earn-wallet', auth, adminController.getWithdrawEarnWallet)
router.post('/withdraw-earn-wallet/update', auth, adminController.updateWithdrawEarnWallet)

// Payment methos apis ----START----
router.get('/payment-methods', auth, paymentmethodController.getPaymentMethods)
router.get('/payment-method/:id', auth, paymentmethodController.getPaymentMethodBYId)
router.post('/payment-method/create', auth, paymentmethodSchema, paymentmethodController.createPaymentMethod)
router.post('/payment-method/update/:id', auth, paymentmethodSchema, paymentmethodController.updatePaymentMethod)
router.post('/payment-method/delete/:id', auth, paymentmethodController.deletePaymentMethod)
// Payment methos apis ----END----

// Notice apis ----START----
router.get('/notices', auth, noticeController.getNotices)
router.get('/notice/:id', auth, noticeController.getNoticeById)
router.post('/notice/create', auth, noticeSchema, noticeController.createNotice)
router.post('/notice/update/:id', auth, noticeSchema, noticeController.updateNotice)
router.post('/notice/delete/:id', auth, noticeController.deleteNotice)
// Notice apis ----END----

// Notice apis ----START----
router.get('/banners', auth, bannerController.getBanners)
router.get('/banner/:id', auth, bannerController.getBannerById)
router.post('/banner/create', auth, bannerSchema, bannerController.createBanner)
router.post('/banner/update/:id', auth, bannerSchema, bannerController.updateBanner)
router.post('/banner/delete/:id', auth, bannerController.deleteBanner)
// Notice apis ----END----

// storeUniPin Start
router.post('/unipin/create', auth, adminController.createUniPinData)
router.post('/unipin/delete/:id', auth, adminController.deleteUniPin)
router.post('/unipin/update/:id', auth, adminController.updateUniPin)
router.get('/unipins', auth, adminController.fetchUniPinData)
router.get('/unipin/:id', auth, adminController.fetchUniPin)
// storeUniPin End

// storeUniPin Start
router.post('/botserver/create', auth, adminController.createBotServer)
router.post('/botserver/delete/:id', auth, adminController.deleteBotServer)
router.post('/botserver/update/:id', auth, adminController.updateBotServer)
router.get('/botservers', auth, adminController.fetchBotServerData)
router.get('/botserver/:id', auth, adminController.fetchBotServer)
// storeUniPin End

// storeUniPin Start
router.post('/unipin/create', auth, adminController.createUniPinData)
router.post('/unipin/delete/:id', auth, adminController.deleteUniPin)
router.post('/unipin/update/:id', auth, adminController.updateUniPin)
router.get('/unipins', auth, adminController.fetchUniPinData)
router.get('/unipin/:id', auth, adminController.fetchUniPin)
// storeUniPin End

// Category apis ----START----
router.get('/categories', auth, categoryController.getCategories)
router.get('/category/:id', auth, categoryController.getCategoryById)
router.post('/category/create', auth, categoryController.createCategory)
router.post('/category/update/:id', auth, categoryController.updateCategory)
router.post('/category/delete/:id', auth, categoryController.deleteCategory)
router.post('/topup-product/:id/categories', auth, categoryController.assignProductCategories)
// Category apis ----END----

// Topup product dynamic inputs ----START----
router.post('/topup-product/:id/inputs', auth, adminController.assignProductInputs)
// Topup product dynamic inputs ----END----

// Site settings apis ----START----
router.get('/site-settings', auth, siteSettingController.get)
router.post('/site-settings/update', auth, siteSettingController.update)

// Spin rewards CRUD ----START----
router.get('/spin-rewards', auth, spinController.adminList)
router.post('/spin-rewards/create', auth, spinController.adminCreate)
router.post('/spin-rewards/update/:id', auth, spinController.adminUpdate)
router.post('/spin-rewards/delete/:id', auth, spinController.adminDelete)
// Spin rewards CRUD ----END----
// Site settings apis ----END----

// Topup Products apis ----START----
router.get('/topup-products', auth, topupProductController.getProducts)
router.get('/topup-product/:id', auth, topupProductController.getProductById)
router.post('/topup-product/create', auth, topupProductSchema, topupProductController.createProduct)
router.post('/topup-product/update/:id', auth, topupProductSchema, topupProductController.updateProduct)
router.post('/topup-product/delete/:id', auth, topupProductController.deleteProduct)
// Topup Products apis ----END----

// Physical Products apis ----START----
router.get('/physical-products', auth, physicalProductController.getProducts)
router.get('/physical-product/:id', auth, physicalProductController.getProductById)
router.post('/physical-product/create', auth, physicalProductSchema, physicalProductController.createProduct)
router.post('/physical-product/update/:id', auth, physicalProductSchema, physicalProductController.updateProduct)
router.post('/physical-product/delete/:id', auth, physicalProductController.deleteProduct)
// Physical Products apis ----END----

// Physical Product Orders apis ----START----
router.get('/physical-products-order', auth, physicalProductController.getProductOrders)
router.post('/update-physical-order-status/:id', auth, physicalProductController.updatePhysicalProductOrderStatus)
// Physical Product Orders apis ----END----

// User apis ----START----
router.get('/users', auth, userController.getUsers)
router.get('/users/earn-wallet/:id', auth, userController.userEarnWallet)
router.post('/earn-wallet/update/:id', auth, userController.userEarnWalletUpdate)
router.get('/user/:id', auth, userController.getUserById)
router.post('/user/update/:id', auth, adminController.updateUser)
router.post('/user/delete/:id', auth, userController.deleteUser)
// User apis ----END----

// Topup Package apis ----START----
router.get('/topup-packages', auth, topuppackageController.getTopupPackages) // Get all topup packages
router.get('/topup-packages/:id', auth, topuppackageController.getTopupPackagesByProductId) // Get topup packages by product id -> :id = product id
router.get('/topup-package/:id', auth, topuppackageController.getTopupPackageById) // get topup package by id
router.post('/topup-package/add', auth, topupPackageSchema, topuppackageController.createTopupPackage)
router.post('/topup-package/update/:id', auth, topupPackageSchema, topuppackageController.updateTopupPackage)
router.post('/topup-package/delete/:id', auth, topuppackageController.deleteTopupPackage)
router.post('/topup-package/update-dollar', auth, updateDollarSchema, topuppackageController.updateDollarRate)
// Topup Package apis ----END----

// Dashboard stats apis ----START----
router.get('/dashboard-stats', auth, adminController.getDashboardStats)
// Dashboard stats apis ----END----

// Change password api ----START----
router.post('/change-password', auth, changePasswordSchema, adminController.changePassword)
// Change password api ----END----

// Order completed by admin api -----START----
router.get('/order-completed-by-admin', auth, adminController.orderCompletedByAdmin)
// Order completed by admin api -----END----

router.get('/orders-chart-data', auth, adminController.getOrderChartData)

// Get User for send sms
router.get('/users-for-send-sms', auth, adminController.getUsersForSendSms)
router.post('/send-sms', auth, sendSmsSchema, adminController.sendSmsToUser)


// admin wallet


//

router.get('/permission/sync', async (req: express.Request, res: express.Response) => {
    const routers = all_routes(router)
    for (const router of routers) {
        const path = router.path;
        for (const method of router.methods) {
            await AuthModule.findOrCreate({
                where: {
                    auth_url: path,
                    method
                },
                defaults: {
                    auth_url: path,
                    method
                }
            })
        }
    }
    res.send({ success: true })
})



export default router;