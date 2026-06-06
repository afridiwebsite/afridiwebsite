import express from 'express';
import productController from '../controllers/product.controller';
import userController from '../controllers/user.controller';
import userAuth from '../middleware/user-auth.middleware';
import { withdrawEarnWalletSchema } from '../middleware/validators/userValidator.middleware';
import categoryController from '../controllers/category.controller';
import siteSettingController from '../controllers/siteSetting.controller';
import coinController from '../controllers/coin.controller';
import spinController from '../controllers/spin.controller';
import searchController from '../controllers/search.controller';
import publicTopupProductController from '../controllers/publicTopupProduct.controller';
import tutorialController from '../controllers/tutorial.controller';
import verificationController from '../controllers/verification.controller';
const router = express.Router();

router.get('/products', productController.getProducts);
router.get('/product-orders', userController.getProductOrders);
router.get('/get-player-name/:playerid', userController.getPlayerName);
// Generic player-name verify backed by an admin-configured verify_url per input.
router.get('/verify-player-input/:input_id', userController.verifyPlayerInput);
// Same backend, but the input row lives on a package (override) instead of the product.
router.get('/verify-package-input/:input_id', userController.verifyPackageInput);
router.get('/product-orders/:product_id', userController.orderList);
router.get('/products/:id', productController.getSingleProduct);
router.get('/users-search', userController.getUserSearch)
router.get('/banner', userController.getBanners)
router.get('/notice', userController.getNotices)
router.get('/notice-modal', userController.getNoticModal)
router.get('/notice-header', userController.getNoticHeader)
router.get('/tutorials', tutorialController.getActiveTutorials)
router.get('/topupproduct', userController.getTopupProducts)
router.get('/topuppackage/:id', userController.getTopupPackagesByProductId) // :id = product id
router.get('/payment-method', userController.getPaymentMethod)
router.post('/packageorder', userAuth, userController.topupPackageOrder)
router.get('/my-ordered-once-packages', userAuth, userController.myOrderedOncePackages)
//router.get('/updateuser/:id', userController.updateUser)
router.get('/usertransaction', userAuth, userController.userTransaction)
router.get('/me/added-total', userAuth, userController.myAddedTotal)
router.get('/myorder', userAuth, userController.myOrder)
router.get('/my-earn-wallet', userAuth, userController.myEarnWallet)
router.post('/addwallet', userAuth, userController.addWallet)
router.post('/search-reset-password-user', userController.searchResetPasswordUser)
router.post('/reset-password', userController.resetPassword)
router.get('/reset-password-otp/:id', userController.resetPasswordOtp)
router.post('/reset-password-otp/:id', userController.resetPasswordVerify)
router.get('/user/profile', userAuth, userController.userProfile)

// User-verification module (KYC). All endpoints respect the
// `verification_enabled` master switch in site settings — when off, /me
// still returns the structure with `enabled: false` so the storefront
// hides the page, but the OTP and submit endpoints reject with 400 to
// avoid wasting SMS credits.
router.get('/verification/me', userAuth, verificationController.me)
router.post('/verification/otp/send', userAuth, verificationController.sendOtp)
router.post('/verification/otp/verify', userAuth, verificationController.verifyOtp)
router.post('/verification/step/:step', userAuth, verificationController.submitStep)
router.get('/topup-payment-method/active', userController.getActivePaymentMethods)
router.post('/change-phone', userAuth, userController.changePhone)
router.get('/verify-phone', userAuth, userController.verifyPhone)
router.post('/verify-otp', userAuth, userController.verifyOtp)
router.get('/inventories', userController.getInventories)
router.get('/inventories/:id', userController.getInventoriesById)
router.get('/inventories/cart-products', userController.cartProducts)
router.post('/product-order', userAuth, userController.productOrder)
router.get('/my-shop-lists', userAuth, userController.getMyShopList)
router.post('/withdraw-earn-wallet', userAuth, withdrawEarnWalletSchema, userController.getWithdrawEarnWallet)
router.get('/user-withdraw-request', userAuth, userController.getUserWithdrawRequest)

router.post('/reset-password-direct', userController.resetPasswordDirect)
// router.get('/pending-order/:id', userController.pendingOrder)
router.post('/webhook', userController.uddoktaPay)
router.post('/check_order', userController.checkOrder)

// Public categories + site settings ----START----
router.get('/categories', categoryController.getCategories)
router.get('/site-settings', siteSettingController.get)
router.get('/topup-products-with-categories', publicTopupProductController.listWithCategories)
// Public categories + site settings ----END----

// Coin apis ----START----
router.get('/coins/me', userAuth, coinController.myCoins)
router.post('/coins/claim', userAuth, coinController.claim)
router.post('/coins/convert', userAuth, coinController.convert)
router.get('/coins/history', userAuth, coinController.history)
// Coin apis ----END----

// Spin apis ----START----
router.get('/spin/overview', userAuth, spinController.overview)
router.post('/spin/spin', userAuth, spinController.spin)
router.get('/spin/history', userAuth, spinController.history)
router.get('/spin/global-history', userAuth, spinController.globalHistory)
// Spin apis ----END----

// Search ----START----
router.get('/search', searchController.search)
// Search ----END----

export default router;