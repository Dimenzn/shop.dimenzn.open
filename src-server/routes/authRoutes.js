import express from 'express'
import { v2 as cloudinary } from 'cloudinary'
import { uploadMiddleware } from '../utils/cloudinary.js'
import { runCloudinaryCleanup } from '../utils/cloudinaryCleanup.js'
import { getSellerInitData } from '../controllers/sellerController.js'

// --- Middlewares ---
import {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} from '../middlewares/validationMiddleware.js'

import {
  verifyInitDatabase,
  verifyAdminToken,
  verifySellerToken,
  verifyAccessToken,
  refreshAccessToken
} from '../middlewares/authMiddleware.js'

import { requireActiveBilling } from '../middlewares/billingGuard.js'
import { requireActiveAccount } from '../middlewares/suspensionGuard.js'

// --- Controllers: Auth & User ---
import {
  registerUser,
  loginUser,
  logoutUser,
  activateAccount,
  resendVerificationEmail,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js'
import {
  getProfile,
  updateProfile,
  updateStoreProfile,
  redeemActivationKey,
  getSellerDashboardStats
} from '../controllers/userController.js'

// --- Controllers: Admin & System ---
import {
  getData,
  saveDataLanguages,
  dropData,
  initDatabase,
  seedDatabase,
  getAdminProducts,
  saveBatchProducts,
  createBatchProducts,
  getAdminOrders,
  saveBatchOrders,
  generateActivationKeys,
  getActivationKeys,
  getAdminUsers,
  toggleSellerStatus
} from '../controllers/adminController.js'
import { saveDataUI } from '../controllers/uiController.js'

// --- Controllers: Entities (Products, Categories, Ads) ---
import {
  createProduct,
  rateProduct,
  getSellerProducts,
  saveSellerBatchProducts,
  createSellerBatchProducts
} from '../controllers/productsController.js'
import { saveDataCategories, createCategory } from '../controllers/categoriesController.js'
import { saveDataAds, createAd } from '../controllers/adsController.js'

// --- Controllers: Commerce (Cart & Orders) ---
import {
  getCart,
  addToCart,
  mergeCarts,
  updateItemQuantity,
  removeItem,
  verifyStock
} from '../controllers/cartsController.js'
import {
  createOrder,
  getMyOrders,
  getSellerOrders,
  saveSellerOrders,
  createExpressDigitalOrder,
  getOrderStatus
} from '../controllers/ordersController.js'

// Payment
import {
  createSetupIntent,
  getSellerCard,
  removeSellerCard,
  adminChargeSeller,
  adminChargeAllSellers,
  settleSellerDebt,
  verifySavedCard,
  createFeeCheckout
} from '../controllers/paymentController.js'

const router = express.Router()

// ==========================================
// 🔐 AUTHENTICATION & TOKENS
// ==========================================
router.post('/register', validateRegistration, registerUser)
router.post('/login', validateLogin, loginUser)
router.post('/logout', logoutUser)
router.post('/refresh', refreshAccessToken)

// ==========================================
// 📧 ACCOUNT RECOVERY & VERIFICATION
// ==========================================
router.post('/activate', activateAccount)
router.post('/verify-email', activateAccount) // Alias for activate
router.post('/resend-verification', resendVerificationEmail)
router.post('/forgot-password', validateForgotPassword, forgotPassword)
router.post('/reset-password', validateResetPassword, resetPassword)

// ==========================================
// 👤 USER: PROFILE & ACTIONS (Requires Access Token)
// ==========================================
router.post('/profile', verifyAccessToken, getProfile)
router.post('/update-profile', verifyAccessToken, updateProfile)
router.post('/rate-product', verifyAccessToken, rateProduct)
router.post('/user/upgrade-role', verifyAccessToken, redeemActivationKey)

// ==========================================
// 🛒 USER: CART (Requires Access Token)
// ==========================================
router.post('/cart/get', verifyAccessToken, getCart)
router.post('/cart/add', verifyAccessToken, addToCart)
router.post('/cart/update-qty', verifyAccessToken, updateItemQuantity)
router.post('/cart/remove-item', verifyAccessToken, removeItem)
router.post('/cart/verify-stock', verifyAccessToken, verifyStock)
router.post('/cart/merge', verifyAccessToken, mergeCarts)

// ==========================================
// 🧾 USER: ORDERS (Requires Access Token)
// ==========================================
router.post('/order/create', verifyAccessToken, createOrder)
router.get('/orders', verifyAccessToken, getMyOrders)
router.post('/orders/express-digital', verifyAccessToken, createExpressDigitalOrder)
router.get('/orders/:id/status', verifyAccessToken, getOrderStatus)

// ==========================================
// 🏪 SELLER: STOREFRONT
// ==========================================
// 🛡️ SECURED: Protected by verifySellerToken. Only verified Sellers can hit these routes!

// ✅ ALLOWED: They MUST be able to view and update existing orders (shipping labels, etc.)
router.get('/seller/orders', verifySellerToken, getSellerOrders)
router.post('/seller/saveBatchOrders', verifySellerToken, saveSellerOrders)

// ✅ ALLOWED: Read-only access to their existing products and stats
router.get('/seller/initData', verifySellerToken, getSellerInitData)
router.get('/seller/products', verifySellerToken, getSellerProducts)
router.get('/seller/dashboard', verifySellerToken, getSellerDashboardStats)

// 🚫 BLOCKED: Prevent them from adding new items or editing their store while suspended
router.post(
  '/seller/createProduct',
  verifySellerToken,
  requireActiveAccount,
  requireActiveBilling,
  createProduct
)
router.post(
  '/seller/saveBatchProducts',
  verifySellerToken,
  requireActiveAccount,
  requireActiveBilling,
  saveSellerBatchProducts
)
router.post(
  '/seller/createBatchProducts',
  verifySellerToken,
  requireActiveAccount,
  requireActiveBilling,
  createSellerBatchProducts
)
router.put(
  '/seller/updateStoreProfile',
  verifySellerToken,
  requireActiveAccount,
  requireActiveBilling,
  updateStoreProfile
)

// ✅ ALLOWED: CRITICAL! They must be able to access the billing system to unlock themselves
router.post('/seller/setup-intent', verifySellerToken, createSetupIntent)
router.get('/seller/billing-card', verifySellerToken, getSellerCard)
router.post('/seller/verify-card', verifySellerToken, verifySavedCard)
router.delete('/seller/billing-card', verifySellerToken, removeSellerCard)
router.post('/seller/settle-debt', verifySellerToken, settleSellerDebt)
router.post('/seller/checkout-fee', verifySellerToken, createFeeCheckout)

// ==========================================
// 🛠️ ADMIN: SYSTEM & CORE DATA (Requires Admin Token)
// ==========================================
router.post('/admin/initDatabase', verifyInitDatabase, initDatabase)
router.post('/admin/seed', verifyAdminToken, seedDatabase)
router.post('/admin/dropData', verifyAdminToken, dropData)
router.post('/admin/getData', verifyAdminToken, getData)
router.post('/admin/saveDataUI', verifyAdminToken, saveDataUI)
router.post('/admin/saveDataLanguages', verifyAdminToken, saveDataLanguages)
router.post('/admin/generate-keys', verifyAdminToken, generateActivationKeys)
router.get('/admin/keys', verifyAdminToken, getActivationKeys)
router.get('/admin/users', verifyAdminToken, getAdminUsers)
router.post('/admin/billing/charge/:sellerId', verifyAdminToken, adminChargeSeller)
router.post('/admin/billing/charge-all', verifyAdminToken, adminChargeAllSellers)
router.post('/admin/seller/:id/toggle-status', verifyAdminToken, toggleSellerStatus)

// ==========================================
// 🛠️ ADMIN: ENTITY MANAGEMENT (Requires Admin Token)
// ==========================================
// Categories
router.post('/admin/createCategory', verifyAdminToken, createCategory)
router.post('/admin/saveDataCategories', verifyAdminToken, saveDataCategories)

// Ads
router.post('/admin/createAd', verifyAdminToken, createAd)
router.post('/admin/saveDataAds', verifyAdminToken, saveDataAds)

// Products
router.get('/admin/products', verifyAdminToken, getAdminProducts)
router.post('/admin/createProduct', verifyAdminToken, createProduct)
router.post('/admin/createBatchProducts', verifyAdminToken, createBatchProducts)
router.post('/admin/saveBatchProducts', verifyAdminToken, saveBatchProducts)

// Orders
router.get('/admin/orders', verifyAdminToken, getAdminOrders)
router.post('/admin/saveBatchOrders', verifyAdminToken, saveBatchOrders)

// ==========================================
// ☁️ CLOUDINARY UPLOAD ROUTE
// ==========================================
// 'image' is the field name we will send from the Vue frontend
router.post('/upload', verifySellerToken, uploadMiddleware.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' })
    }

    // req.file.path contains the secure Cloudinary URL generated by the storage engine!
    res.status(200).json({
      success: true,
      url: req.file.path
    })
  } catch (error) {
    console.error('❌ [Upload] Error:', error)
    res.status(500).json({ success: false, message: 'ERR_UPLOAD_FAILED' })
  }
})

// ==========================================
// 🗑️ DELETE CLOUDINARY IMAGE
// ==========================================
router.post('/upload/delete', async (req, res) => {
  try {
    const { imageUrl } = req.body
    if (!imageUrl) return res.status(400).json({ message: 'No URL provided' })

    // 🌟 THE FIX: Smarter Public ID Extraction
    // Finds where "dimenzn-shop" starts, and grabs everything after it, minus the .jpg extension
    const folderStartIndex = imageUrl.indexOf('dimenzn-shop/')
    if (folderStartIndex === -1) {
      return res.status(400).json({ message: 'Not a valid shop image URL' })
    }

    // e.g., "dimenzn-shop/sellers/xyz123"
    const publicId = imageUrl.substring(folderStartIndex).split('.')[0]

    // Tell Cloudinary to delete it
    await cloudinary.uploader.destroy(publicId, { invalidate: true })

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('❌ [Cloudinary] Delete Error:', error)
    res.status(500).json({ success: false })
  }
})

// Cleanup
router.post('/admin/cloudinary/cleanup', verifyAdminToken, async (req, res) => {
  try {
    // 🌟 Pass 'true' so the Admin button deletes EVERYTHING immediately
    const deletedCount = await runCloudinaryCleanup(true)
    res.status(200).json({ success: true, deletedCount })
  } catch {
    res.status(500).json({ success: false, message: 'ERR_CLEANUP_FAILED' })
  }
})

export default router
