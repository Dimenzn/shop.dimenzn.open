import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'
import Product from '../models/productModel.js'
import Order from '../models/orderModel.js'
import UI from '../models/uiModel.js'
import ActivationKey from '../models/activationKeyModel.js'
import { generateAccessToken, generateRefreshToken } from '../middlewares/authMiddleware.js'

// ==========================================
// 👤 GET USER PROFILE
// ==========================================
/**
 * Fetches the profile of the currently authenticated user.
 * Automatically excludes sensitive data like passwords and refresh tokens.
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken')

    if (!user) {
      console.warn(`⚠️ [User] Profile not found for ID: ${req.user._id}`)
      return res.status(404).json({ message: 'AUTH_USER_NOT_FOUND' })
    }

    res.status(200).json(user)
  } catch (error) {
    console.error('❌ [User] Profile fetch error:', error)
    res.status(500).json({ message: 'USER_FETCH_ERR' })
  }
}

// ==========================================
// ✏️ UPDATE USER PROFILE
// ==========================================
/**
 * Updates the authenticated user's personal details and shipping address.
 * Returns the updated user object (sanitized of sensitive fields).
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id
    const { firstName, lastName, phone, shippingAddress, locale } = req.body
    const user = await User.findById(userId)

    if (!user) {
      console.warn(`⚠️ [User] Update failed. User not found for ID: ${userId}`)
      return res.status(404).json({ message: 'AUTH_USER_NOT_FOUND' })
    }

    // 1. Update Identity Fields
    if (firstName !== undefined) user.firstName = firstName
    if (lastName !== undefined) user.lastName = lastName
    if (phone !== undefined) user.phone = phone
    if (locale !== undefined) user.locale = locale

    // 2. Update Nested Shipping Address
    if (shippingAddress !== undefined) {
      user.shippingAddress = {
        address: shippingAddress.address,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country
      }
    }

    const updatedUser = await user.save()
    console.log(`✅ [User] Profile updated successfully for: ${user.email}`)

    // 3. Sanitize the response object
    // Convert the Mongoose document to a plain JS object so we can delete keys safely
    const userResponse = updatedUser.toObject()
    delete userResponse.password
    delete userResponse.refreshToken

    // Return the sanitized user.
    // The 'SILENT' message tells the Quasar frontend NOT to pop up a distracting toast notification.
    res.status(200).json({ userProfile: userResponse, message: 'SILENT' })
  } catch (error) {
    console.error('❌ [User] Update profile error:', error)
    res.status(500).json({ message: 'USER_UPDATE_ERR' })
  }
}

// ==========================================
// 🏪 UPDATE SELLER STORE PROFILE
// ==========================================
export const updateStoreProfile = async (req, res) => {
  try {
    // 🌟 1. ADMIN IMPERSONATION LOGIC
    let targetUserId = req.user._id

    // Security Check
    if (req.user.role === 'admin' && req.query.targetSellerId) {
      targetUserId = req.query.targetSellerId
    } else if (req.user.role !== 'seller' && req.user.role !== 'platform') {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    const { storeProfile } = req.body

    // 2. Prevent empty submissions
    if (!storeProfile) {
      return res.status(400).json({ message: 'VAL_MISSING_FIELDS' })
    }

    // 3. Find the user and update ONLY their storeProfile
    // 🌟 THE FIX: Use targetUserId instead of req.user._id
    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        $set: {
          'storeProfile.storeName': storeProfile.storeName,
          'storeProfile.storeDescription': storeProfile.storeDescription,
          'storeProfile.storeLogo': storeProfile.storeLogo,
          'storeProfile.storeBanner': storeProfile.storeBanner,
          'storeProfile.shipping.isFree': storeProfile.shipping?.isFree || false,
          'storeProfile.shipping.flatRate': storeProfile.shipping?.flatRate || 0,
          'storeProfile.socials': storeProfile.socials
        }
      },
      { new: true, runValidators: true }
    )

    if (!updatedUser) {
      return res.status(404).json({ message: 'AUTH_USER_NOT_FOUND' })
    }

    // 4. Return success and the updated profile data
    res.status(200).json({
      success: true,
      message: 'DATA_SAVE_SUCCESS',
      storeProfile: updatedUser.storeProfile
    })
  } catch (error) {
    console.error('❌ [User Controller] Update Store Profile Error:', error)
    res.status(500).json({ message: 'DATA_SAVE_ERR' })
  }
}

export const redeemActivationKey = async (req, res) => {
  try {
    const { key } = req.body

    if (!key) return res.status(400).json({ message: 'KEY_REQUIRED' })

    const validKey = await ActivationKey.findOne({ key: key.toUpperCase().trim() })

    if (!validKey) return res.status(404).json({ message: 'KEY_INVALID' })
    if (validKey.isUsed) return res.status(400).json({ message: 'KEY_ALREADY_USED' })
    if (validKey.type !== 'seller_upgrade')
      return res.status(400).json({ message: 'KEY_WRONG_TYPE' })

    // 🌟 Prevent platform users from using a key too
    if (['seller', 'admin', 'platform'].includes(req.user.role)) {
      return res.status(400).json({ message: 'ALREADY_HAVE_PERMISSION' })
    }

    // ==========================================
    // 🌟 PLATFORM INITIALIZATION GUARD
    // ==========================================
    const platformAccountExists = await User.exists({ role: 'platform' })
    const assignedRole = platformAccountExists ? 'seller' : 'platform'

    if (!platformAccountExists) {
      console.log(`👑 [Auth] Key redeemed. Assigning PLATFORM role to user ${req.user._id}.`)

      // 🌟 NEW: Auto-generate the digital key product for the frontend!
      try {
        const existingKeyProduct = await Product.findOne({ id: 'platform-seller-key' })

        if (!existingKeyProduct) {
          const newPlatformKey = new Product({
            id: 'platform-seller-key',
            sellerId: req.user._id, // The new Platform Admin owns this product
            price: 5000, // Default placeholder price (Admin can change later)
            quantity: 99999, // Infinite digital stock
            isPlatformService: true, // 🌟 Bypasses physical shipping requirements
            locales: {
              'en-US': {
                title: 'Seller Activation Key',
                description:
                  'Unlock full seller privileges, create your own storefront, and start selling products instantly. This is a one-time digital upgrade.',
                images: [
                  'https://res.cloudinary.com/dj3tlelan/image/upload/v1776878620/dimenzn-shop/admin/v7nzgzfmjanjvcprs1ok.png'
                ], // Placeholder image
                specifications: [],
                declarations: []
              }
            }
          })
          await newPlatformKey.save()
          console.log(
            `📦 [Platform] Auto-generated 'platform-seller-key' product for digital checkout.`
          )
        }
      } catch (err) {
        console.error('❌ [Platform] Failed to auto-generate platform key product:', err)
      }
    }

    // 🌟 THE FIX: Build the update payload dynamically
    const updatePayload = { role: assignedRole }

    if (assignedRole === 'platform') {
      // Pass the platform tier directly into the storeProfile
      updatePayload['storeProfile.sellerTier'] = 'platform'
      updatePayload['storeProfile.trustScore'] = 5000
      updatePayload['storeProfile.storeName'] = 'DIMENZN'
      updatePayload['storeProfile.storeDescription'] =
        'Welcome to the official Dimenzn platform store. We provide verified digital services, account upgrades, and premium support.'

      // Note: If you'd rather they just be considered a 'pro' seller,
      // you can change the above string to 'pro' instead!
    }

    // 4. Upgrade the User!
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updatePayload }, // 🌟 Pass the dynamic payload here using $set
      { new: true }
    )

    // 5. Mark the Key as Used
    validKey.isUsed = true
    validKey.usedBy = req.user._id
    validKey.usedAt = new Date()
    await validKey.save()

    // 6. 🪄 THE MAGIC TRICK: Generate fresh tokens with the NEW role
    const newAccessToken = generateAccessToken(updatedUser._id)
    const newRefreshToken = generateRefreshToken(updatedUser._id)

    updatedUser.refreshToken = newRefreshToken
    await updatedUser.save()

    res.status(200).json({
      success: true,
      message: 'UPGRADE_SUCCESS',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      },
      user: {
        _id: updatedUser._id,
        role: updatedUser.role, // 🌟 Frontend will now correctly receive 'platform'
        email: updatedUser.email
      }
    })
  } catch (error) {
    console.error('❌ [User] Redeem Key Error:', error)
    res.status(500).json({ message: 'ERROR_REDEEMING_KEY' })
  }
}

/**
 * Public route to fetch a seller's storefront profile
 */
export const getSellerProfile = async (req, res) => {
  try {
    const { id } = req.params

    // 1. Find the user
    const seller = await User.findById(id).select('storeProfile role createdAt')

    // 2. Security & Logic Checks
    if (!seller || !['seller', 'admin', 'platform'].includes(seller.role)) {
      return res.status(404).json({ message: 'SELLER_NOT_FOUND' })
    }

    // 🌟 3. SUSPENSION GUARD & GOD MODE BYPASS
    if (seller.storeProfile?.accountStatus === 'suspended') {
      let isAdmin = false

      // Check if the request is coming from an authenticated Admin
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1]
          const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
          const requester = await User.findById(decoded.id).select('role')

          if (requester?.role === 'admin') isAdmin = true
        } catch {
          // Token might be missing or expired, which is fine for a public route. We just ignore it.
        }
      }

      // If they are a normal user or guest, throw a 404!
      if (!isAdmin) {
        console.warn(`⚠️ [Storefront] Blocked public access to suspended store: ${seller._id}`)
        return res.status(404).json({ message: 'SILENT' })
      }
    }

    // 4. Return the public profile data
    res.status(200).json({
      success: true,
      profile: seller.storeProfile,
      joinedAt: seller.createdAt
    })
  } catch (error) {
    console.error('❌ [User] Fetch Seller Profile Error:', error)
    res.status(500).json({ message: 'ERROR_FETCHING_PROFILE' })
  }
}

// ==========================================
// 📊 GET SELLER DASHBOARD STATS (FINAL OPTIMIZED)
// ==========================================
export const getSellerDashboardStats = async (req, res) => {
  try {
    // 🌟 1. ADMIN IMPERSONATION LOGIC
    let sellerId = req.user._id // Default to the logged-in user

    // Security Check: Allow Sellers, Platform, AND allow Admins who are impersonating
    if (req.user.role === 'admin' && req.query.targetSellerId) {
      sellerId = req.query.targetSellerId
    } else if (req.user.role !== 'seller' && req.user.role !== 'platform') {
      // 🌟 ADDED PLATFORM ALLOWANCE
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    // 🌟 UPDATED: Fetch the Seller's Debt Ledger AND Trust Score using the target sellerId
    const sellerProfile = await User.findById(sellerId)
      .select('storeProfile.platformFeesOwed storeProfile.trustScore')
      .lean()

    const platformFeesOwed = sellerProfile?.storeProfile?.platformFeesOwed || 0
    const trustScore = sellerProfile?.storeProfile?.trustScore ?? 1500

    // ... (The rest of your aggregation code stays exactly the same!)

    // ==========================================
    // 🌟 4. DYNAMIC PENDING PAYOUT (All-Time In-Transit / Unpaid)
    // ==========================================
    const pendingAgg = await Order.aggregate([
      {
        $match: {
          isPaid: false,
          status: { $nin: ['cancelled', 'cancelled_restored'] }
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: null,
          totalPending: {
            $sum: {
              $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 1] }]
            }
          }
        }
      }
    ])

    const pendingBalance = pendingAgg[0]?.totalPending || 0

    const activeProducts = await Product.countDocuments({ sellerId })

    // ==========================================
    // 🌟 TIME CALCULATIONS
    // ==========================================
    const timeframe = req.query.timeframe || '30d'
    const today = new Date()
    let startDate = new Date()

    const categories = []
    const chartData = []
    const dateMap = {}
    let dateFormat = '%Y-%m-%d'

    if (timeframe === '7d') {
      startDate.setDate(today.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        categories.push(d.toLocaleDateString('en-US', { weekday: 'short' }))
        chartData.push(0)
        dateMap[d.toISOString().split('T')[0]] = 6 - i
      }
    } else if (timeframe === '30d') {
      startDate.setDate(today.getDate() - 29)
      startDate.setHours(0, 0, 0, 0)
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        categories.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        chartData.push(0)
        dateMap[d.toISOString().split('T')[0]] = 29 - i
      }
    } else if (timeframe === '12m') {
      startDate.setMonth(today.getMonth() - 11)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      dateFormat = '%Y-%m'

      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(today.getMonth() - i)
        categories.push(d.toLocaleDateString('en-US', { month: 'short' }))
        chartData.push(0)
        const yrMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        dateMap[yrMonth] = 11 - i
      }
    }

    // ==========================================
    // 🌟 1. CHART AGGREGATION
    // ==========================================
    const salesAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
          status: { $nin: ['cancelled', 'cancelled_restored'] }
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          dailyTotal: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      }
    ])

    salesAgg.forEach(sale => {
      const arrayIndex = dateMap[sale._id]
      if (arrayIndex !== undefined) {
        chartData[arrayIndex] = sale.dailyTotal
      }
    })

    const revenueChart = { categories, data: chartData }

    // ==========================================
    // 🌟 2. KPI AGGREGATION
    // ==========================================
    const kpiAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
          status: { $nin: ['cancelled', 'cancelled_restored'] }
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: null,
          periodEarnings: {
            $sum: {
              $multiply: [{ $ifNull: ['$items.price', 0] }, { $ifNull: ['$items.quantity', 1] }]
            }
          },
          periodItemsSold: { $sum: { $ifNull: ['$items.quantity', 1] } }
        }
      }
    ])

    const timeframeEarned = kpiAgg[0]?.periodEarnings || 0
    const timeframeItemsSold = kpiAgg[0]?.periodItemsSold || 0

    // ==========================================
    // 🌟 3. DYNAMIC TOP PRODUCTS
    // ==========================================
    const topProductsAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isPaid: true,
          status: { $nin: ['cancelled', 'cancelled_restored'] }
        }
      },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': new mongoose.Types.ObjectId(sellerId) } },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: { $ifNull: ['$items.quantity', 1] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ])

    let topProducts = []

    if (topProductsAgg.length > 0) {
      const topProductIds = topProductsAgg.map(p => p._id)
      const topProductsRaw = await Product.find({ id: { $in: topProductIds } }).lean()

      topProducts = topProductsAgg
        .map(aggItem => {
          const p = topProductsRaw.find(prod => prod.id === aggItem._id)
          if (!p) return null

          const loc = p.locales['en-US'] || Object.values(p.locales)[0] || {}

          let totalStock = p.quantity || 0
          if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
            totalStock = p.sizes.reduce((sum, sizeObj) => sum + (sizeObj.qty || 0), 0)
          }

          return {
            id: p.id,
            title: loc.title || 'Unknown Product',
            image: loc.images?.[0] || 'https://cdn.quasar.dev/img/material.png',
            sold: aggItem.totalSold,
            stock: totalStock
          }
        })
        .filter(Boolean)
    } else {
      const fallbackProducts = await Product.find({ sellerId }).limit(5).lean()
      topProducts = fallbackProducts.map(p => {
        const loc = p.locales['en-US'] || Object.values(p.locales)[0] || {}

        let totalStock = p.quantity || 0
        if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
          totalStock = p.sizes.reduce((sum, sizeObj) => sum + (sizeObj.qty || 0), 0)
        }

        return {
          id: p.id,
          title: loc.title || 'Unknown Product',
          image: loc.images?.[0] || 'https://cdn.quasar.dev/img/material.png',
          sold: 0,
          stock: totalStock
        }
      })
    }

    // ==========================================
    // 🌟 4. CHECK FOR "BLEEDING" (STAGNANT) ORDERS
    // ==========================================

    // Fetch dynamic threshold from the database
    const uiConfig = (await UI.findOne()) || {}
    const stagnantDays = uiConfig.stagnantDays ?? 7

    // Calculate the dynamic cutoff date

    // 🛠️ DEV HACK: Make Admin UI "Days" act like "Minutes"
    // const cutoffDate = new Date(Date.now() - stagnantDays * 60 * 1000)
    // 🛠️ DEV HACK

    // *** REAL LIFE ***
    const cutoffDate = new Date(Date.now() - stagnantDays * 24 * 60 * 60 * 1000)
    // *** REAL LIFE ***

    const stagnantOrdersCount = await Order.countDocuments({
      'items.sellerId': new mongoose.Types.ObjectId(sellerId),
      status: { $in: ['pending', 'confirmed', 'shipped'] },
      updatedAt: { $lt: cutoffDate } // 🌟 Using the dynamic cutoff Date
    })

    // ==========================================
    // 🌟 5. GLOBAL SELLER LEADERBOARD (Top 10)
    // ==========================================
    // Find top 10 sellers sorted by their Trust Score
    const allSellersRaw = await User.find({
      role: 'seller',
      'storeProfile.accountStatus': { $ne: 'suspended' }
      //'storeProfile.billingStatus': { $ne: 'restricted' }
    })
      .select('_id email storeProfile.storeName storeProfile.trustScore')
      .sort({ 'storeProfile.trustScore': -1 })
      //.limit(10)
      .lean()

    // Map the data safely for the frontend
    const leaderboard = allSellersRaw.map(user => ({
      id: user._id,
      storeName: user.storeProfile?.storeName || user.email?.split('@')[0] || 'Anonymous Seller',
      trustScore: user.storeProfile?.trustScore ?? 1500
    }))

    // ==========================================
    // 🌟 FINAL RESPONSE
    // ==========================================
    res.status(200).json({
      success: true,
      stats: {
        totalEarned: timeframeEarned,
        itemsSold: timeframeItemsSold,
        pendingBalance,
        activeProducts,
        platformFeesOwed,
        trustScore,
        stagnantOrdersCount,
        leaderboard // 🌟 NEW: Added to the stats payload!
      },
      revenueChart,
      topProducts
    })
  } catch (error) {
    console.error('❌ [Dashboard] Fetch error:', error)
    res.status(500).json({ message: 'ERROR_FETCHING_DASHBOARD' })
  }
}

// ==========================================
// 🏆 GET TOP SELLERS (PUBLIC BANNER)
// ==========================================
export const getTopSellers = async (req, res) => {
  try {
    // 1. Fetch top 4 active sellers sorted by Trust Score
    const topSellers = await User.find({
      role: 'seller',
      'storeProfile.accountStatus': { $ne: 'suspended' },
      'storeProfile.billingStatus': { $ne: 'restricted' }
    })
      .select(
        'storeProfile.storeName storeProfile.storeBanner storeProfile.storeLogo storeProfile.trustScore'
      ) // STRICTLY only public data!
      .sort({ 'storeProfile.trustScore': -1 })
      .limit(5)
      .lean()

    res.status(200).json({ sellers: topSellers })
  } catch (error) {
    console.error('❌ [Users] Fetch Top Sellers Error:', error)
    res.status(500).json({ message: 'ERROR_FETCHING_TOP_SELLERS' })
  }
}
