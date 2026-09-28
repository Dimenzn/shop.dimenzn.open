import express from 'express'
import Product from '../models/productModel.js'
import User from '../models/userModel.js'

// --- Controllers ---

// System
import { installSystem, getSystemConfig } from '../controllers/adminController.js'

// Payment
import { createPaymentIntent } from '../controllers/paymentController.js'

// Products
import {
  getProducts,
  getProductById,
  incrementProductView,
  getProductStats,
  getProductsByIds
} from '../controllers/productsController.js'

// UI & Global Config
import { getUI } from '../controllers/uiController.js'
import { getLanguages } from '../controllers/languagesController.js'
import { getAds } from '../controllers/adsController.js'
import { getCategories } from '../controllers/categoriesController.js'

// Cart Operations
import {
  getGuestCart,
  addOrUpdateGuestCart,
  updateItemQuantity,
  removeItem,
  verifyStock
} from '../controllers/cartsController.js'

// Orders
import { createOrder, getOrderById } from '../controllers/ordersController.js'

// Seller
import { getSellerProfile, getTopSellers } from '../controllers/userController.js'

const router = express.Router()

// ==========================================
// 🚀 SYSTEM & INSTALLATION
// ==========================================
router.post('/install/system', installSystem)
router.get('/config', getSystemConfig)

// ==========================================
// 📦 PRODUCTS
// ==========================================
router.get('/products', getProducts)
router.get('/products/stats', getProductStats)
router.get('/products/batch', getProductsByIds)
router.get('/product/:id', getProductById)
router.post('/product/view', incrementProductView)

// ==========================================
// 🎨 UI & CONFIGURATION
// ==========================================
router.post('/ui', getUI)
router.post('/languages', getLanguages)
router.post('/ads', getAds)
router.post('/categories', getCategories)

// ==========================================
// 🛒 GUEST CART OPERATIONS
// ==========================================
router.post('/cart/get', getGuestCart)
router.post('/cart/add', addOrUpdateGuestCart)
router.post('/cart/update-qty', updateItemQuantity)
router.post('/cart/remove-item', removeItem)
router.post('/cart/verify-stock', verifyStock)

// ==========================================
// 🧾 ORDERS
// ==========================================
router.post('/order/payment', createPaymentIntent)
router.post('/order/create', createOrder)
router.get('/order/:id', getOrderById)

// ==========================================
// SELLERS
// ==========================================
router.get('/top-sellers', getTopSellers)
router.get('/seller-profile/:id', getSellerProfile)

// ==========================================
// ⏱️ DEV SYNC ROUTE (Only used for Time Warp)
// ==========================================
router.get('/dev/time', (req, res) => {
  // If the backend warp is running, this returns the WARPED time.
  // If not, it just returns the normal real time.
  res.json({
    serverTime: Date.now()
  })
})

router.get('/bot-preview/product/:id', async (req, res) => {
  try {
    const productId = req.params.id
    // 🌟 Grab the locale from the URL query (e.g., 'rs-RS' or 'th-TH')
    const requestedLocale = req.query.locale

    const product = await Product.findOne({ id: productId })
    if (!product) return res.status(404).send('Product not found')

    // 🌟 SMART FALLBACK: Try the requested locale FIRST.
    // If it doesn't exist, fall back to English, then fall back to whatever the first available language is.
    const localeData =
      product.locales[requestedLocale] ||
      product.locales['en-US'] ||
      Object.values(product.locales)[0] ||
      {}

    const title = localeData.title || 'Dimenzn Product'

    const rawDesc = localeData.description || 'Check out this amazing product on Dimenzn!'
    const description = rawDesc.replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 150) + '...'
    const image =
      localeData.images?.[0] ||
      'https://res.cloudinary.com/dj3tlelan/image/upload/v1775605975/dimenzn-shop/admin/raanjbjagpuqew7rx38a.png'

    const frontendDomain = process.env.BASE_URL_API || 'https://dimenzn.com'

    // 🌟 Keep the locale in the redirect URL so when the human clicks,
    // the SPA knows to open the page in that specific language!
    const productUrl = `${frontendDomain}/product/${productId}?locale=${requestedLocale || 'en-US'}`

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${title} | Dimenzn</title>
      <meta name="description" content="${description}">

      <meta property="og:type" content="website">
      <meta property="og:url" content="${productUrl}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${image}">

      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:url" content="${productUrl}">
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}">
      <meta name="twitter:image" content="${image}">
      <meta name="theme-color" content="#1976d2">

      <meta http-equiv="refresh" content="0; url=${productUrl}">
    </head>
    <body style="background-color: #121212; color: white; text-align: center; padding-top: 20vh;">
      <h2>Redirecting to Dimenzn...</h2>
      <script>window.location.replace("${productUrl}");</script>
    </body>
    </html>
    `

    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (error) {
    console.error('Bot Proxy Error:', error)
    res.status(500).send('Server Error generating preview')
  }
})

router.get('/bot-preview/seller/:id', async (req, res) => {
  try {
    const sellerId = req.params.id
    // Grab the locale so we can pass it back to the frontend redirect
    const requestedLocale = req.query.locale || 'en-US'

    // Fetch the seller from your database (Adjust 'User' to match your model name)
    const seller = await User.findById(sellerId)

    if (!seller) return res.status(404).send('Seller not found')

    // Extract the store profile data
    // (If your schema stores this directly on the user, remove '.storeProfile')
    const profile = seller.storeProfile || seller

    const title = profile.storeName || 'Dimenzn Store'

    const rawDesc = profile.storeDescription || 'Check out this store on Dimenzn!'
    const description = rawDesc.replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 150) + '...'

    // Prefer the banner, fallback to logo, fallback to default Dimenzn image
    const image =
      profile.storeBanner ||
      profile.storeLogo ||
      'https://res.cloudinary.com/dj3tlelan/image/upload/v1775605975/dimenzn-shop/admin/raanjbjagpuqew7rx38a.png'

    const frontendDomain = process.env.BASE_URL_API || 'https://dimenzn.com'

    // Build the correct frontend URL for the seller profile
    const sellerUrl = `${frontendDomain}/seller/${sellerId}?locale=${requestedLocale}`

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${title} | Dimenzn</title>
      <meta name="description" content="${description}">

      <meta property="og:type" content="website">
      <meta property="og:url" content="${sellerUrl}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${image}">

      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:url" content="${sellerUrl}">
      <meta name="twitter:title" content="${title}">
      <meta name="twitter:description" content="${description}">
      <meta name="twitter:image" content="${image}">
      <meta name="theme-color" content="#1976d2">

      <meta http-equiv="refresh" content="0; url=${sellerUrl}">
    </head>
    <body style="background-color: #121212; color: white; text-align: center; padding-top: 20vh;">
      <h2>Redirecting to Dimenzn...</h2>
      <script>window.location.replace("${sellerUrl}");</script>
    </body>
    </html>
    `

    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (error) {
    console.error('Bot Proxy Error (Seller):', error)
    res.status(500).send('Server Error generating seller preview')
  }
})

export default router
