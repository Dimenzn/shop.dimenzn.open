import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { updateEnvVariables } from '../utils/envHelper.js'

// --- Models ---
import User from '../models/userModel.js'
import Language from '../models/languageModel.js'
import Ui from '../models/uiModel.js'
import Category from '../models/categoryModel.js'
import Product from '../models/productModel.js'
import Ad from '../models/adModel.js'
import Order from '../models/orderModel.js'
import ActivationKey from '../models/activationKeyModel.js'

// --- Initial Seed Data ---
import dataI18N from '../../sampleDB/languages.json' with { type: 'json' }
import dataUI from '../../sampleDB/ui.json' with { type: 'json' }

// --- Directory Setup ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==========================================
// 🚀 SYSTEM INSTALLATION & RESET
// ==========================================

export const getSystemConfig = async (req, res) => {
  res.json({
    success: true,
    market: process.env.MARKET_ENV || 'us',
    // We send the PUBLIC key from the global .env to the frontend here
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
    // Tell the frontend if we are in installer mode
    isInstalled: !!(process.env.MONGODB_URI && process.env.MONGODB_URI !== 'ConnectionString')
  })
}

export const installSystem = async (req, res) => {
  const { mongoUri } = req.body
  if (!mongoUri) return res.status(400).json({ message: 'Missing URI' })

  const currentUri = process.env.MONGODB_URI
  const isInstalled = currentUri && currentUri !== 'ConnectionString'

  if (isInstalled) {
    console.warn('⚠️ [Security] Unauthorized attempt to access installer on active system.')
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'System is already installed and locked. Access denied.'
    })
  }

  try {
    console.log('🔌 [Installer] Testing database connection...')
    await mongoose.connect(mongoUri)
    console.log('✅ [Installer] Connection success!')

    // 🌟 FIX 1: Use the smart environment router!
    updateEnvVariables({ MONGODB_URI: mongoUri })
    console.log(`📝 [Installer] Environment file successfully updated.`)

    // FIX 2: Tell Nginx to close the connection gracefully so it doesn't hang
    res.set('Connection', 'close')
    res.json({ success: true, message: 'Connected & Saved. Rebooting...' })

    // FIX 3: Give Nginx 3 full seconds to deliver the message to the browser
    setTimeout(() => {
      const triggerFile = path.resolve(__dirname, '../../server.js')
      const isDev = process.env.NODE_ENV === 'development'

      if (isDev) {
        console.log('🔁 [System] Dev Mode: Touching server.js to trigger Nodemon...')
        if (fs.existsSync(triggerFile)) {
          const now = new Date()
          fs.utimesSync(triggerFile, now, now)
        } else {
          console.warn('⚠️ [System] Could not find server.js to touch at:', triggerFile)
        }
      } else {
        console.log('💀 [System] Production Mode: Exiting process to trigger PM2 restart...')
        process.exit(1)
      }
    }, 3000)
  } catch (error) {
    console.error('❌ [Installer] Connection failed:', error)
    res.status(400).json({ success: false, message: 'Could not connect. Check string.' })
  }
}

export const initDatabase = async (req, res) => {
  try {
    const langCount = await Language.countDocuments()
    const uiCount = await Ui.countDocuments()

    if (langCount > 0 || uiCount > 0) {
      console.warn('⚠️ [DB] Init aborted: Database already contains core data.')
      return res.status(403).json({ message: 'DB_ALREADY_INIT' })
    }

    console.log('🌱 [DB] Initializing core collections (UI & Languages)...')
    await Language.insertMany(dataI18N)
    await Ui.insertMany(dataUI)
    await Category.insertMany([])
    await Product.insertMany([])
    await Ad.insertMany([])

    res.status(201).json({ message: 'System Setup Complete! Please Register.' })
  } catch (error) {
    console.error('❌ [DB] initDatabase error:', error)
    res.status(500).json({ message: 'Failed to initialize the database.' })
  }
}

export const dropData = async (req, res) => {
  try {
    // 🌟 THE FIX: Use the smart environment router!
    updateEnvVariables({ MONGODB_URI: 'ConnectionString' })
    console.log('🗑️ [System] .env connection string wiped.')

    // 🌟 We keep the timeout, but it no longer needs to be inside an 'if' block!
    setTimeout(() => {
      const triggerFile = path.resolve(__dirname, '../../server.js')
      const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

      if (isDev) {
        console.log('🔁 [System] Dev Mode: Touching server.js to trigger Nodemon...')
        if (fs.existsSync(triggerFile)) {
          const now = new Date()
          fs.utimesSync(triggerFile, now, now)
        }
      } else {
        console.log('💀 [System] Production Mode: Exiting process to trigger PM2/Docker...')
        process.exit(1)
      }
    }, 1000)

    console.log('🗑️ [DB] Deleting all collections...')
    const collections = mongoose.connection.collections
    for (const key in collections) {
      await collections[key].deleteMany({})
    }

    res.status(200).json({ message: 'DB_CLEARED' })
  } catch (error) {
    console.error('❌ [DB] DB_DROP_ERR:', error)
    res.status(500).json({ message: 'DB_DROP_ERR', error })
  }
}

// ==========================================
// ⚙️ GLOBAL DATA MANAGEMENT
// ==========================================

export const getData = async (req, res) => {
  try {
    const languages = await Language.find()
    const categories = await Category.find()
    const ads = await Ad.find()
    const ui = await Ui.find()

    res.json({
      languages,
      categories,
      ads,
      ui,
      products: [],
      orders: []
    })
  } catch (error) {
    console.error('❌ [Admin] Essentials fetch error:', error)
    res.status(500).json({ message: 'FETCH_ERR' })
  }
}

// 🌟 REFACTOR: Removed price, quantity, and sizes from the fallback generator!
const getFallbackContent = (localesObject, type = 'product') => {
  if (!localesObject) return null
  if (localesObject['en-US']) return localesObject['en-US']

  const keys = Object.keys(localesObject)
  if (keys.length > 0) return localesObject[keys[0]]

  if (type === 'category') return { title: 'New Category' }
  if (type === 'ad') return { title: 'New Ad', description: '', image: '', link: '' }

  return {
    title: 'New Product',
    description: '',
    images: [],
    specifications: [],
    declarations: []
  }
}

export const saveDataLanguages = async (req, res) => {
  try {
    const updateLangs = req.body

    const ads = await Ad.find().lean()
    const categories = await Category.find().lean()
    const products = await Product.find().lean()

    await Language.deleteMany({})
    const languages = await Language.insertMany(updateLangs)

    const targetLangCodes = languages.filter(lang => lang.selected === true).map(lang => lang.value)

    console.log('🌍 [Admin] Backfilling localized data for active languages:', targetLangCodes)

    // 1. Sync Ads
    if (ads?.length > 0) {
      for (const ad of ads) {
        if (!ad.locales) ad.locales = {}
        const sourceData = getFallbackContent(ad.locales, 'ad')
        targetLangCodes.forEach(langCode => {
          if (!ad.locales[langCode]) {
            ad.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
          }
        })
        await Ad.findByIdAndUpdate(ad._id, { locales: ad.locales }, { new: true })
      }
    }

    // 2. Sync Categories
    if (categories?.length > 0) {
      for (const category of categories) {
        if (!category.title) category.title = {}
        const catSourceTitle =
          category.title['en-US'] || Object.values(category.title)[0] || 'Untitled'

        targetLangCodes.forEach(langCode => {
          if (!category.title[langCode]) category.title[langCode] = catSourceTitle
        })

        if (category.sub?.length > 0) {
          for (const sub of category.sub) {
            if (!sub.title) sub.title = {}
            const subSourceTitle =
              sub.title['en-US'] || Object.values(sub.title)[0] || 'Untitled Sub'
            targetLangCodes.forEach(langCode => {
              if (!sub.title[langCode]) sub.title[langCode] = subSourceTitle
            })
          }
        }
        await Category.findByIdAndUpdate(
          category._id,
          { title: category.title, sub: category.sub },
          { new: true }
        )
      }
    }

    // 3. Sync Products
    if (products?.length > 0) {
      for (const product of products) {
        if (!product.locales) product.locales = {}
        const sourceData = getFallbackContent(product.locales, 'product')
        targetLangCodes.forEach(langCode => {
          if (!product.locales[langCode]) {
            product.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
          }
        })
        await Product.findByIdAndUpdate(product._id, { locales: product.locales }, { new: true })
      }
    }

    console.log('✅ [Admin] Language synchronization complete.')
    res.status(200).json({ message: 'DATA_SAVE_SUCCESS' })
  } catch (error) {
    console.error('❌ [Admin] saveDataLanguages error:', error)
    res.status(500).json({ message: 'DATA_SAVE_ERR' })
  }
}

// ==========================================
// 📦 PRODUCTS MANAGEMENT
// ==========================================

export const getAdminProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      order = 'desc',
      locale = 'en-US',
      targetSellerId // 🌟 1. Extract the God Mode ID from Pinia!
    } = req.query

    const query = {}

    // 🌟 2. GOD MODE FILTER: Lock the query to this specific seller
    if (targetSellerId) {
      query.sellerId = targetSellerId
    }

    if (search && search !== 'unset') {
      query.$or = [
        { id: { $regex: search, $options: 'i' } },
        { [`locales.${locale}.title`]: { $regex: search, $options: 'i' } },
        { categories: { $elemMatch: { $eq: search } } }
      ]
    }

    if (search === 'unset') {
      query.categories = { $size: 0 }
    }

    const sortOptions = {}
    // 🌟 REFACTOR: If sorting by title, use locale. If anything else (like price or sold), use root!
    if (sortBy === 'title') {
      sortOptions[`locales.${locale}.${sortBy}`] = order === 'desc' ? -1 : 1
    } else {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1
    }

    const products = await Product.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort(sortOptions)

    // Because 'query' now includes the sellerId, this count will perfectly match the
    // number of products that seller actually owns!
    const totalProducts = await Product.countDocuments(query)

    res.json({
      products,
      totalProducts,
      currentPage: Number(page),
      totalPages: Math.ceil(totalProducts / limit)
    })
  } catch (error) {
    console.error('❌ [Admin] Product Fetch Error:', error)
    res.status(500).json({ message: 'Server Error' })
  }
}

export const saveBatchProducts = async (req, res) => {
  try {
    const { updated = [], deleted = [] } = req.body

    if (updated.length === 0 && deleted.length === 0) {
      return res.status(200).json({ message: 'DATA_UPDATE_MISS' })
    }

    const activeLanguages = await Language.find({ selected: true }).lean()
    const targetLangCodes = activeLanguages.map(l => l.value)

    const bulkOps = []
    const now = Date.now()

    updated.forEach((product, index) => {
      const cleanData = { ...product }
      delete cleanData._id
      cleanData.updatedAt = new Date(now + index)

      if (!cleanData.locales) cleanData.locales = {}

      let sourceKey = 'en-US'
      if (!cleanData.locales[sourceKey]) sourceKey = Object.keys(cleanData.locales)[0]

      const sourceData = cleanData.locales[sourceKey] || {
        title: 'New',
        description: '',
        images: [],
        specifications: [],
        declarations: []
      }

      targetLangCodes.forEach(langCode => {
        if (!cleanData.locales[langCode]) {
          cleanData.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
        }
      })

      // 🌟 REFACTOR: DELETED the old price synchronization loop! Price is safely at root now.

      bulkOps.push({
        updateOne: {
          filter: { id: cleanData.id },
          update: { $set: cleanData }
        }
      })
    })

    deleted.forEach(id => {
      bulkOps.push({ deleteOne: { filter: { id: id } } })
    })

    if (bulkOps.length > 0) {
      const result = await Product.bulkWrite(bulkOps)
      res.json({ success: true, message: 'DATA_SAVE_SUCCESS', details: result })
    } else {
      res.json({ success: true, message: 'DATA_UPDATE_MISS' })
    }
  } catch (error) {
    console.error('❌ [Admin] Batch Product Save Error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

export const createBatchProducts = async (req, res) => {
  try {
    const { products } = req.body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(200).json({ success: false, message: 'DATA_UPDATE_MISS' })
    }

    const activeLanguages = await Language.find({ selected: true }).lean()
    const targetLangCodes = activeLanguages.map(l => l.value)
    const now = new Date()

    const productsToInsert = products.map(p => {
      // ==========================================
      // 🌟 GOD MODE SECURITY GUARD
      // ==========================================
      // If Pinia sent a sellerId (God Mode), use it.
      // Otherwise, default to the Admin's own ID.
      const finalSellerId = p.sellerId ? p.sellerId : req.user._id

      if (!p.locales) p.locales = {}
      const sourceData = getFallbackContent(p.locales, 'product')

      targetLangCodes.forEach(langCode => {
        if (!p.locales[langCode]) {
          p.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
        }
      })

      return {
        ...p,
        sellerId: finalSellerId, // 🌟 Forcefully assign the owner here!
        id: p.id || nanoid(),
        createdAt: now,
        updatedAt: now
      }
    })

    const result = await Product.insertMany(productsToInsert, { ordered: false })

    res.json({
      success: true,
      message: 'DATA_SAVE_SUCCESS',
      count: result.length,
      products: result
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'PROD_EXISTS' })
    }
    console.error('❌ [Admin] Batch Create Error:', error)
    res.status(500).json({ success: false, message: 'PROD_CREATE_ERR' })
  }
}

// ==========================================
// 🧾 ORDERS MANAGEMENT
// ==========================================

export const getAdminOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, statuses, targetSellerId } = req.query
    const query = {}
    if (targetSellerId) {
      query['items.sellerId'] = targetSellerId
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      query.$or = [
        { _id: search.match(/^[0-9a-fA-F]{24}$/) ? search : null },
        { 'contactInfo.firstName': searchRegex },
        { 'contactInfo.lastName': searchRegex },
        { 'contactInfo.email': searchRegex }
      ].filter(Boolean)
    } else if (statuses) {
      const statusArray = statuses.split(',')
      if (statusArray.length > 0) {
        query.status = { $in: statusArray }
      }
    }

    const skip = (page - 1) * limit
    const totalOrders = await Order.countDocuments(query)

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))

    res.json({
      orders,
      totalOrders,
      currentPage: Number(page),
      totalPages: Math.ceil(totalOrders / limit)
    })
  } catch (error) {
    console.error('❌ [Admin] Get Orders Error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

// ==========================================
// 💾 ADMIN: BATCH UPDATE ORDERS & RESTOCK (God Mode)
// ==========================================
export const saveBatchOrders = async (req, res) => {
  try {
    const { orders } = req.body

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: 'DATA_UPDATE_MISS' })
    }

    let restockCount = 0
    let unrestockCount = 0
    const bulkOps = []

    for (const orderUpdate of orders) {
      const dbOrder = await Order.findById(orderUpdate._id)
      if (!dbOrder) continue

      const oldStatus = dbOrder.status
      const newStatus = orderUpdate.status

      let updateFields = {
        status: newStatus,
        updatedAt: new Date()
      }

      const isCOD = dbOrder.paymentMethod && dbOrder.paymentMethod.toLowerCase() === 'cod'

      if (isCOD) {
        // ---------------------------------------------------------
        // 🟢 ADMIN ACTION: FORCE DELIVERY (Add Fee)
        // ---------------------------------------------------------
        if (newStatus === 'delivered' && oldStatus !== 'delivered') {
          updateFields.isPaid = true
          updateFields.paidAt = new Date()

          if (!dbOrder.platformFeeCharged && dbOrder.platformFeeTotal > 0) {
            const sellerId = dbOrder.items[0]?.sellerId
            if (sellerId) {
              // 🌟 Using $inc ensures safe math if 10 orders for the same seller update instantly
              await User.findByIdAndUpdate(sellerId, {
                $inc: { 'storeProfile.platformFeesOwed': dbOrder.platformFeeTotal }
              })
            }
            updateFields.platformFeeCharged = true // 🔒 Lock it via bulkWrite
            console.log(`[Admin God Mode] Order ${dbOrder._id} delivered. Fee applied!`)
          }
        }
        // ---------------------------------------------------------
        // 🔴 ADMIN ACTION: REVERSE DELIVERY (Refund Fee)
        // ---------------------------------------------------------
        else if (oldStatus === 'delivered' && newStatus !== 'delivered') {
          updateFields.isPaid = false

          if (dbOrder.platformFeeTotal > 0) {
            const sellerId = dbOrder.items[0]?.sellerId
            if (sellerId) {
              const seller = await User.findById(sellerId)

              if (seller && seller.storeProfile) {
                const currentDebt = seller.storeProfile.platformFeesOwed || 0
                const feeToRefund = dbOrder.platformFeeTotal

                // 🌟 THE STRIPE CHECK: Do they still owe us this money?
                if (currentDebt >= feeToRefund) {
                  seller.storeProfile.platformFeesOwed -= feeToRefund
                  await seller.save()
                  console.log(
                    `[Admin God Mode] Order ${dbOrder._id} reversed. Fee of ${feeToRefund} removed.`
                  )
                } else {
                  console.warn(
                    `⚠️ [Admin God Mode] Reversed order ${dbOrder._id}, but Seller debt is already 0. Stripe already processed this fee!`
                  )
                }
              }
            }
            updateFields.platformFeeCharged = false // 🔓 Un-lock it via bulkWrite
          }
        } else if (newStatus === 'cancelled' || newStatus === 'cancelled_restored') {
          updateFields.isPaid = false
        }
      }

      // ---------------------------------------------------------
      // SCENARIO A: RESTOCKING
      // ---------------------------------------------------------
      if (newStatus === 'cancelled_restored' && oldStatus !== 'cancelled_restored') {
        console.log(`♻️ [Admin] Restocking items for order: ${dbOrder._id}`)

        for (const item of dbOrder.items) {
          if (item.productId && item.quantity > 0) {
            const product = await Product.findOne({ id: item.productId })

            if (product) {
              if (item.size) {
                let sizeObj = null
                if (item.sizeId) sizeObj = product.sizes?.find(s => s.id === item.sizeId)
                if (!sizeObj && item.size) sizeObj = product.sizes?.find(s => s.size === item.size)

                if (sizeObj) sizeObj.qty = (parseInt(sizeObj.qty) || 0) + item.quantity
              } else {
                product.quantity = (parseInt(product.quantity) || 0) + item.quantity
              }

              product.sold = Math.max(0, (product.sold || 0) - item.quantity)
              await product.save()
              restockCount++
            }
          }
        }
      }
      // ---------------------------------------------------------
      // SCENARIO B: UN-RESTOCKING
      // ---------------------------------------------------------
      else if (oldStatus === 'cancelled_restored' && newStatus !== 'cancelled_restored') {
        console.log(`⚠️ [Admin] Reversing restock (Deducting) for order: ${dbOrder._id}`)

        for (const item of dbOrder.items) {
          if (item.productId && item.quantity > 0) {
            const product = await Product.findOne({ id: item.productId })

            if (product) {
              if (item.size) {
                let sizeObj = null
                if (item.sizeId) sizeObj = product.sizes?.find(s => s.id === item.sizeId)
                if (!sizeObj && item.size) sizeObj = product.sizes?.find(s => s.size === item.size)

                if (sizeObj) sizeObj.qty = Math.max(0, (parseInt(sizeObj.qty) || 0) - item.quantity)
              } else {
                product.quantity = Math.max(0, (parseInt(product.quantity) || 0) - item.quantity)
              }

              product.sold = (product.sold || 0) + item.quantity
              await product.save()
              unrestockCount++
            }
          }
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: dbOrder._id },
          update: { $set: updateFields } // 🌟 updateFields now contains the lock status!
        }
      })
    }

    const result = await Order.bulkWrite(bulkOps)

    console.log(
      `✅ [Admin] Batch update: ${result.modifiedCount} orders updated. Items Added: ${restockCount}, Items Removed: ${unrestockCount}.`
    )
    res
      .status(200)
      .json({ success: true, message: 'DATA_SAVE_SUCCESS', count: result.modifiedCount })
  } catch (error) {
    console.error('❌ [Admin] Batch Save Orders Error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

// ==========================================
// Generates X number of seller activation keys.
// ==========================================

export const generateActivationKeys = async (req, res) => {
  try {
    const count = req.body.count || 1
    const isGift = req.body.isGift || false // 🌟 NOVI PARAMETAR (false podrazumevano)
    const newKeys = []

    // 🌟 ODREĐIVANJE PREFIKSA
    const prefix = isGift ? 'GIFT' : 'REDE'

    for (let i = 0; i < count; i++) {
      const randomString = crypto.randomBytes(4).toString('hex').toUpperCase()
      // 🌟 KORIŠĆENJE DINAMIČKOG PREFIKSA
      const formattedKey = `${prefix}-${randomString.slice(0, 4)}-${randomString.slice(4, 8)}`

      newKeys.push({
        key: formattedKey,
        createdBy: req.user._id
      })
    }

    const createdKeys = await ActivationKey.insertMany(newKeys)

    res.status(201).json({
      success: true,
      message: 'KEYS_GENERATED',
      keys: createdKeys
    })
  } catch (error) {
    console.error('❌ [Admin] Generate Keys Error:', error)
    res.status(500).json({ message: 'ERROR_GENERATING_KEYS' })
  }
}

export const getActivationKeys = async (req, res) => {
  try {
    const keys = await ActivationKey.find().sort({ createdAt: -1 })
    res.status(200).json(keys)
  } catch (error) {
    console.error('❌ [Admin] Fetch Keys Error:', error)
    res.status(500).json({ message: 'ERROR_FETCHING_KEYS' })
  }
}

// ==========================================
// 👥 ADMIN: FETCH ALL USERS (SELLERS & BUYERS)
// ==========================================
export const getAdminUsers = async (req, res) => {
  try {
    // We fetch all users, but explicitly exclude their hashed passwords for security.
    // We make sure to pull the storeProfile data since the Admin Ledger needs it!
    const users = await User.find({}).select('-password').lean() // .lean() makes the query faster since we only need to read the data

    res.status(200).json({
      success: true,
      users
    })
  } catch (error) {
    console.error('❌ [Admin] Fetch Users Error:', error)
    res.status(500).json({ success: false, message: 'ERR_FETCH_USERS' })
  }
}

// ==========================================
// 🛑 MANUAL SELLER SUSPENSION (KILL SWITCH)
// ==========================================
export const toggleSellerStatus = async (req, res) => {
  try {
    const { id } = req.params
    const seller = await User.findById(id)

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ message: 'SELLER_NOT_FOUND' })
    }

    // Initialize if it doesn't exist
    if (!seller.storeProfile.accountStatus) {
      seller.storeProfile.accountStatus = 'active'
    }

    // Toggle the status
    const newStatus = seller.storeProfile.accountStatus === 'active' ? 'suspended' : 'active'
    seller.storeProfile.accountStatus = newStatus

    await seller.save()

    // 🌟 THE FIX: Assign a specific i18n key based on the new status
    const messageKey = newStatus === 'suspended' ? 'MSG_SELLER_SUSPENDED' : 'MSG_SELLER_ACTIVATED'

    res.status(200).json({
      success: true,
      message: messageKey, // Send the key, not the English text!
      accountStatus: newStatus
    })
  } catch (error) {
    console.error('❌ [Admin] Toggle Seller Status Error:', error)
    res.status(500).json({ message: 'ERROR_UPDATING_STATUS' })
  }
}

// // ==========================================
// // 🌾 DATABASE SEEDING
// // ==========================================

// export const seedDatabase = async (req, res) => {
//   const TARGET_COUNT = 100

//   try {
//     console.log('🗑️ [Seed] Clearing existing data...')
//     await Product.deleteMany({})
//     await Category.deleteMany({})
//     await Ad.deleteMany({})

//     const activeLanguages = await Language.find({ selected: true }).lean()
//     const targetLangCodes = activeLanguages.map(l => l.value)

//     const getFallback = (localesObject, type) => {
//       if (!localesObject) return null
//       if (localesObject['en-US']) return localesObject['en-US']

//       const keys = Object.keys(localesObject)
//       if (keys.length > 0) return localesObject[keys[0]]

//       if (type === 'ad') return { title: 'New Ad', description: '', image: '', link: '' }
//       if (type === 'category') return { title: 'New Category' }

//       return {
//         title: 'New Product',
//         description: '',
//         images: [],
//         specifications: [],
//         declarations: []
//       }
//     }

//     console.log('📢 [Seed] Syncing and Inserting Ads...')
//     const syncedAds = DATA_ADS.map(ad => {
//       const newAd = JSON.parse(JSON.stringify(ad))
//       if (!newAd.locales) newAd.locales = {}

//       const sourceData = getFallback(newAd.locales, 'ad')
//       targetLangCodes.forEach(langCode => {
//         if (!newAd.locales[langCode]) {
//           newAd.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
//         }
//       })
//       return newAd
//     })
//     await Ad.insertMany(syncedAds)

//     console.log('🗂️ [Seed] Syncing and Inserting Categories...')
//     const syncCategories = categories => {
//       return categories.map(cat => {
//         const newCat = JSON.parse(JSON.stringify(cat))
//         if (!newCat.locales) newCat.locales = {}

//         const sourceData = getFallback(newCat.locales, 'category')
//         targetLangCodes.forEach(langCode => {
//           if (!newCat.locales[langCode]) {
//             newCat.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
//           }
//         })

//         if (newCat.sub && newCat.sub.length > 0) {
//           newCat.sub = syncCategories(newCat.sub)
//         }
//         return newCat
//       })
//     }

//     const syncedCategories = syncCategories(DATA_CATEGORIES)
//     await Category.insertMany(syncedCategories)

//     const validCategoryCombinations = []
//     const extractCombinations = items => {
//       items.forEach(item => {
//         if (item.sub && item.sub.length > 0) {
//           item.sub.forEach(subItem => {
//             validCategoryCombinations.push([item.id, subItem.id])
//             if (subItem.sub && subItem.sub.length > 0) {
//               extractCombinations([subItem])
//             }
//           })
//         } else {
//           validCategoryCombinations.push([item.id])
//         }
//       })
//     }
//     extractCombinations(syncedCategories)

//     console.log(`🛍️ [Seed] Generating ${TARGET_COUNT} products...`)
//     const generatedProducts = []
//     const now = Date.now()

//     for (let i = 0; i < TARGET_COUNT; i++) {
//       const template =
//         DATA_PRODUCT_TEMPLATES[Math.floor(Math.random() * DATA_PRODUCT_TEMPLATES.length)]
//       const product = JSON.parse(JSON.stringify(template))

//       product.id = `mock-${now}-${i}`
//       product.rating = Math.floor(Math.random() * 5) + 1
//       product.views = Math.floor(Math.random() * 2000)
//       product.sold = Math.floor(Math.random() * 500)
//       product.ratings = []

//       // 🌟 REFACTOR: Random price and clean data directly into the root
//       const randomPrice = Math.floor(Math.random() * (30000 - 2000 + 1)) + 2000
//       product.price = randomPrice

//       if (!product.locales) product.locales = {}

//       const sourceData = getFallback(product.locales, 'product')
//       if (sourceData) sourceData.title = `${sourceData.title} (${i + 1})`

//       targetLangCodes.forEach(langCode => {
//         if (!product.locales[langCode]) {
//           product.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
//         }
//       })

//       if (validCategoryCombinations.length > 0) {
//         const randomCombo =
//           validCategoryCombinations[Math.floor(Math.random() * validCategoryCombinations.length)]
//         product.categories = randomCombo
//       } else {
//         product.categories = []
//       }

//       product.createdAt = new Date(now + i * 1000)
//       product.updatedAt = new Date(now + i * 1000)

//       generatedProducts.push(product)
//     }

//     await Product.insertMany(generatedProducts)
//     console.log('✅ [Seed] Database seeded successfully.')

//     res.status(200).json({
//       success: true,
//       message: 'DB_SEEDED',
//       details: `Seeded: ${DATA_ADS.length} ads, ${DATA_CATEGORIES.length} root categories, and ${generatedProducts.length} products.`,
//       sample: generatedProducts[0]
//     })
//   } catch (error) {
//     console.error('❌ [Seed] Seeding error:', error)
//     res.status(500).json({ message: 'SEED_FAIL', error: error.message })
//   }
// }

// ==========================================
// 🌾 DATABASE SEEDING
// ==========================================
export const seedDatabase = async (req, res) => {
  const TARGET_COUNT = 100
  const SELLERS_COUNT = 10
  const PRODUCTS_PER_SELLER = TARGET_COUNT / SELLERS_COUNT

  try {
    console.log('🗑️ [Seed] Clearing existing data...')
    await Product.deleteMany({})
    await Category.deleteMany({})
    await Ad.deleteMany({})
    await User.deleteMany({ email: { $regex: '@seed.com' } })
    await Order.deleteMany({ 'contactInfo.email': { $regex: '@seed-buyer.com' } })

    const activeLanguages = await Language.find({ selected: true }).lean()
    const targetLangCodes = activeLanguages.map(l => l.value)

    const getFallback = (localesObject, type) => {
      if (!localesObject) return null
      if (localesObject['en-US']) return localesObject['en-US']

      const keys = Object.keys(localesObject)
      if (keys.length > 0) return localesObject[keys[0]]

      if (type === 'ad') return { title: 'New Ad', description: '', image: '', link: '' }
      if (type === 'category') return { title: 'New Category' }

      return {
        title: 'New Product',
        description: '',
        images: [],
        specifications: [],
        declarations: []
      }
    }

    // ==========================================
    // 📢 1. GENERATE ADS
    // ==========================================
    console.log('📢 [Seed] Syncing and Inserting Ads...')
    const syncedAds = DATA_ADS.map(ad => {
      const newAd = JSON.parse(JSON.stringify(ad))
      if (!newAd.locales) newAd.locales = {}

      const sourceData = getFallback(newAd.locales, 'ad')
      targetLangCodes.forEach(langCode => {
        if (!newAd.locales[langCode]) {
          newAd.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
        }
      })
      return newAd
    })
    await Ad.insertMany(syncedAds)

    // ==========================================
    // 🗂️ 2. GENERATE CATEGORIES
    // ==========================================
    console.log('🗂️ [Seed] Syncing and Inserting Categories...')
    const syncCategories = categories => {
      return categories.map(cat => {
        const newCat = JSON.parse(JSON.stringify(cat))
        if (!newCat.locales) newCat.locales = {}

        const sourceData = getFallback(newCat.locales, 'category')
        targetLangCodes.forEach(langCode => {
          if (!newCat.locales[langCode]) {
            newCat.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
          }
        })

        if (newCat.sub && newCat.sub.length > 0) {
          newCat.sub = syncCategories(newCat.sub)
        }
        return newCat
      })
    }

    const syncedCategories = syncCategories(DATA_CATEGORIES)
    await Category.insertMany(syncedCategories)

    const validCategoryCombinations = []
    const extractCombinations = items => {
      items.forEach(item => {
        if (item.sub && item.sub.length > 0) {
          item.sub.forEach(subItem => {
            validCategoryCombinations.push([item.id, subItem.id])
            if (subItem.sub && subItem.sub.length > 0) {
              extractCombinations([subItem])
            }
          })
        } else {
          validCategoryCombinations.push([item.id])
        }
      })
    }
    extractCombinations(syncedCategories)

    // ==========================================
    // 🧑‍💼 3. GENERATE SELLERS
    // ==========================================
    console.log(`🧑‍💼 [Seed] Generating ${SELLERS_COUNT} sellers...`)
    const generatedSellers = []
    for (let i = 0; i < SELLERS_COUNT; i++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000)

      const newSeller = new User({
        email: `seller${i + 1}@seed.com`,
        password: 'password123',
        role: 'seller',
        isActive: true,
        firstName: 'Test',
        lastName: `Seller ${i + 1}`,
        storeProfile: {
          storeName: `ROCKY #${randomSuffix}`,
          trustScore: Math.floor(Math.random() * (4500 - 1500 + 1)) + 1500,
          storeDescription: 'This is an automatically generated seed seller.'
        }
      })
      await newSeller.save()
      generatedSellers.push(newSeller)
    }

    // ==========================================
    // 🛍️ 4. GENERATE PRODUCTS
    // ==========================================
    console.log(`🛍️ [Seed] Generating ${TARGET_COUNT} products...`)
    const generatedProducts = []
    const now = Date.now()

    for (let i = 0; i < TARGET_COUNT; i++) {
      const template =
        DATA_PRODUCT_TEMPLATES[Math.floor(Math.random() * DATA_PRODUCT_TEMPLATES.length)]
      const product = JSON.parse(JSON.stringify(template))

      product.id = `mock-${now}-${i}`
      product.rating = Math.floor(Math.random() * 5) + 1
      product.views = Math.floor(Math.random() * 2000)
      product.sold = Math.floor(Math.random() * 500)
      product.ratings = []

      // 🌟 REALISTIC USD PRICING: $15 to $250
      product.price = Math.floor(Math.random() * (250 - 15 + 1)) + 15

      // Assign to a seller
      const sellerIndex = Math.floor(i / PRODUCTS_PER_SELLER)
      product.sellerId = generatedSellers[sellerIndex]._id

      // Handle Locales
      if (!product.locales) product.locales = {}
      const sourceData = getFallback(product.locales, 'product')
      if (sourceData) sourceData.title = `${sourceData.title} (${i + 1})`

      targetLangCodes.forEach(langCode => {
        if (!product.locales[langCode]) {
          product.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
        }
      })

      // Randomly assign valid category combinations
      if (validCategoryCombinations.length > 0) {
        const randomCombo =
          validCategoryCombinations[Math.floor(Math.random() * validCategoryCombinations.length)]
        product.categories = randomCombo
      } else {
        product.categories = []
      }

      product.createdAt = new Date(now + i * 1000)
      product.updatedAt = new Date(now + i * 1000)

      generatedProducts.push(product)
    }
    await Product.insertMany(generatedProducts)

    // ==========================================
    // 📦 5. GENERATE REALISTIC ORDERS
    // ==========================================
    console.log(`📦 [Seed] Generating random orders for sellers...`)
    const generatedOrders = []
    const orderStatuses = [
      'pending',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
      'cancelled_restored'
    ]
    const paymentMethods = ['cod', 'card']

    // 🌟 REALISTIC USD PLATFORM FEE: $2 per item
    const PLATFORM_FEE_PER_ITEM = 2

    for (const seller of generatedSellers) {
      const sellerProducts = generatedProducts.filter(p => p.sellerId === seller._id)
      if (sellerProducts.length === 0) continue

      const numOrders = Math.floor(Math.random() * 10) + 3

      for (let j = 0; j < numOrders; j++) {
        const orderItems = []
        let itemsSubtotal = 0
        let platformFeeTotal = 0

        const numItems = Math.floor(Math.random() * 3) + 1

        for (let k = 0; k < numItems; k++) {
          const randomProduct = sellerProducts[Math.floor(Math.random() * sellerProducts.length)]
          const qty = Math.floor(Math.random() * 2) + 1

          const title = randomProduct.locales['en-US']?.title || 'Seeded Product'
          const image = randomProduct.locales['en-US']?.images?.[0] || ''

          orderItems.push({
            productId: randomProduct.id,
            sellerId: seller._id,
            title: title,
            price: randomProduct.price,
            quantity: qty,
            platformFee: PLATFORM_FEE_PER_ITEM,
            image: image,
            size: 'N/A'
          })

          itemsSubtotal += randomProduct.price * qty
          platformFeeTotal += PLATFORM_FEE_PER_ITEM
        }

        const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)]
        const randomMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)]

        const randomDaysAgo = Math.floor(Math.random() * 30)
        const randomHoursAgo = Math.floor(Math.random() * 24)
        const orderDate = new Date(
          Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000 - randomHoursAgo * 60 * 60 * 1000
        )

        const newOrder = new Order({
          contactInfo: {
            email: `buyer${Math.floor(Math.random() * 9000) + 1000}@seed-buyer.com`,
            firstName: 'Mock',
            lastName: 'Customer',
            phone: '+15550198372' // Standard US 555 dummy number
          },
          shippingAddress: {
            address: '123 Market Street',
            city: 'San Francisco',
            postalCode: '94103', // Valid US ZIP format
            country: 'US' // US Country Code
          },
          items: orderItems,
          platformFeeTotal: platformFeeTotal,
          totalAmount: itemsSubtotal + platformFeeTotal + 15, // Mock $15 USD shipping cost
          currency: 'USD',
          paymentMethod: randomMethod,
          isPaid: randomMethod === 'card' || randomStatus === 'delivered',
          status: randomStatus,
          createdAt: orderDate,
          updatedAt: orderDate
        })

        generatedOrders.push(newOrder)
      }
    }

    await Order.insertMany(generatedOrders)
    console.log(`✅ [Seed] Successfully generated ${generatedOrders.length} orders.`)

    res.status(200).json({
      success: true,
      message: 'DB_SEEDED',
      details: `Seeded: ${DATA_ADS.length} ads, ${DATA_CATEGORIES.length} root categories, ${generatedSellers.length} sellers, ${generatedProducts.length} products, and ${generatedOrders.length} orders.`,
      sample: generatedOrders[0]
    })
  } catch (error) {
    console.error('❌ [Seed] Seeding error:', error)
    res.status(500).json({ message: 'SEED_FAIL', error: error.message })
  }
}

// ==========================================
// 📄 STATIC SEED DATA
// ==========================================

const DATA_ADS = []

const DATA_CATEGORIES = [
  {
    link: 'best-sellers',
    id: 'best-sellers',
    title: { 'en-US': 'Best Sellers', 'sr-Latn-RS': 'Najprodavanije' },
    sub: [
      {
        link: 'new-arrivals',
        id: 'new-arrivals',
        title: { 'en-US': 'New Arrivals', 'sr-Latn-RS': 'Najnovije' }
      }
    ]
  },
  {
    link: 'men',
    id: 'men',
    title: { 'en-US': "Men's Fashion", 'sr-Latn-RS': 'Muška moda' },
    sub: [
      {
        link: 'men-clothing',
        id: 'men-clothing',
        title: { 'en-US': 'Clothing', 'sr-Latn-RS': 'Odeća' }
      },
      {
        link: 'men-accessories',
        id: 'men-accessories',
        title: { 'en-US': 'Accessories', 'sr-Latn-RS': 'Aksesoari' }
      },
      {
        link: 'men-safety',
        id: 'men-safety',
        title: { 'en-US': 'Safety Gear', 'sr-Latn-RS': 'Zaštitna oprema' }
      }
    ]
  },
  {
    link: 'women',
    id: 'women',
    title: { 'en-US': "Women's Fashion", 'sr-Latn-RS': 'Ženska moda' },
    sub: [
      {
        link: 'women-clothing',
        id: 'women-clothing',
        title: { 'en-US': 'Clothing', 'sr-Latn-RS': 'Odeća' }
      },
      {
        link: 'women-accessories',
        id: 'women-accessories',
        title: { 'en-US': 'Accessories', 'sr-Latn-RS': 'Aksesoari' }
      },
      {
        link: 'women-safety',
        id: 'women-safety',
        title: { 'en-US': 'Safety Gear', 'sr-Latn-RS': 'Zaštitna oprema' }
      }
    ]
  },
  {
    link: 'outdoor',
    id: 'outdoor',
    title: { 'en-US': 'Sports & Outdoors', 'sr-Latn-RS': 'Sport i rekreacija' },
    sub: [
      {
        link: 'outdoor-tools',
        id: 'outdoor-tools',
        title: { 'en-US': 'Camping Tools', 'sr-Latn-RS': 'Oprema za kampovanje' }
      },
      {
        link: 'outdoor-safety',
        id: 'outdoor-safety',
        title: { 'en-US': 'Protective Gear', 'sr-Latn-RS': 'Zaštitna oprema' }
      },
      {
        link: 'outdoor-clothing',
        id: 'outdoor-clothing',
        title: { 'en-US': 'Sportswear', 'sr-Latn-RS': 'Sportska odeća' }
      }
    ]
  },
  {
    link: 'tools',
    id: 'tools',
    title: { 'en-US': 'Tools & Equipment', 'sr-Latn-RS': 'Alati i oprema' },
    sub: [
      {
        link: 'tools-electronics',
        id: 'tools-electronics',
        title: { 'en-US': 'Electronics', 'sr-Latn-RS': 'Elektronika' }
      },
      {
        link: 'tools-safety',
        id: 'tools-safety',
        title: { 'en-US': 'Work Safety', 'sr-Latn-RS': 'Zaštita na radu' }
      },
      {
        link: 'tools-general',
        id: 'tools-general',
        title: { 'en-US': 'General Tools', 'sr-Latn-RS': 'Opšti alati' }
      }
    ]
  },
  {
    link: 'electronics',
    id: 'electronics',
    title: { 'en-US': 'Electronics', 'sr-Latn-RS': 'Elektronika' },
    sub: [
      {
        link: 'electronics-gadgets',
        id: 'electronics-gadgets',
        title: { 'en-US': 'Gadgets', 'sr-Latn-RS': 'Gedžeti' }
      },
      {
        link: 'electronics-accessories',
        id: 'electronics-accessories',
        title: { 'en-US': 'Accessories', 'sr-Latn-RS': 'Oprema i dodaci' }
      }
    ]
  },
  {
    link: 'clothing',
    id: 'clothing',
    title: { 'en-US': 'General Apparel', 'sr-Latn-RS': 'Garderoba' },
    sub: [
      {
        link: 'clothing-men',
        id: 'clothing-men',
        title: { 'en-US': 'Men', 'sr-Latn-RS': 'Muškarci' }
      },
      {
        link: 'clothing-women',
        id: 'clothing-women',
        title: { 'en-US': 'Women', 'sr-Latn-RS': 'Žene' }
      }
    ]
  },
  {
    link: 'safety',
    id: 'safety',
    title: { 'en-US': 'Safety & Protection', 'sr-Latn-RS': 'Zaštita i bezbednost' },
    sub: [
      {
        link: 'safety-equipment',
        id: 'safety-equipment',
        title: { 'en-US': 'Equipment', 'sr-Latn-RS': 'Oprema' }
      },
      {
        link: 'safety-wearables',
        id: 'safety-wearables',
        title: { 'en-US': 'Wearables', 'sr-Latn-RS': 'Nosiva oprema' }
      }
    ]
  }
]

// 🌟 REFACTOR: Notice that price, quantity, and sizes are now strictly at the ROOT of the template object!
const DATA_PRODUCT_TEMPLATES = [
  {
    id: '1',
    rating: 1,
    views: 5,
    sold: 64000,
    categories: [],
    price: 125634,
    quantity: 0,
    sizes: [
      { id: 'm', size: 'M', qty: 15 },
      { id: 'l', size: 'L', qty: 8 },
      { id: 'xl', size: 'XL', qty: 20 },
      { id: 'xxl', size: 'XXL', qty: 5 }
    ],
    locales: {
      'en-US': {
        title: 'Outdoor',
        images: [
          'https://img.kwcdn.com/product/Fancyalgo/VirtualModelMatting/da826e5b5fa905d54f9d7917b81f1bbf.jpg'
        ],
        description:
          'Premium outdoor protective gear designed for extreme durability and comfort. Ideal for hiking, climbing, and tactical use.',
        specifications: [
          { title: 'Material', description: 'Ballistic Nylon & Neoprene' },
          { title: 'Weight', description: '1.2kg' },
          { title: 'Water Resistance', description: 'IPX4' }
        ],
        declarations: [
          { title: 'Origin', description: 'Made in Vietnam' },
          { title: 'Warranty', description: '2 Years Manufacturer' }
        ]
      },
      'sr-Latn-RS': {
        title: 'Outdoor oprema',
        images: [
          'https://img.kwcdn.com/product/Fancyalgo/VirtualModelMatting/da826e5b5fa905d54f9d7917b81f1bbf.jpg'
        ],
        description:
          'Vrhunska zaštitna oprema za boravak u prirodi dizajnirana za ekstremnu izdržljivost i udobnost. Idealna za planinarenje, penjanje i taktičku upotrebu.',
        specifications: [
          { title: 'Materijal', description: 'Balistički najlon i neopren' },
          { title: 'Težina', description: '1.2kg' },
          { title: 'Otpornost na vodu', description: 'IPX4' }
        ],
        declarations: [
          { title: 'Poreklo', description: 'Zemlja porekla: Vijetnam' },
          { title: 'Garancija', description: '2 godine garancije proizvođača' }
        ]
      }
    }
  },
  {
    id: '2',
    rating: 3,
    views: 15,
    sold: 64000,
    categories: [],
    price: 8500,
    quantity: 0,
    sizes: [
      { id: 's', size: 'S', qty: 12 },
      { id: 'm', size: 'M', qty: 25 },
      { id: 'l', size: 'L', qty: 18 },
      { id: 'xl', size: 'XL', qty: 10 }
    ],
    locales: {
      'en-US': {
        title: "Men's Casual Sports Cargo Pants",
        images: ['https://img.kwcdn.com/product/fancy/2b37b82d-be6c-446a-b979-fca02824f73b.jpg'],
        description:
          'Versatile cargo pants featuring multiple pockets and moisture-wicking fabric. Perfect for both athletic activities and casual daily wear.',
        specifications: [
          { title: 'Fabric', description: '95% Polyester, 5% Spandex' },
          { title: 'Fit', description: 'Relaxed Fit' },
          { title: 'Care', description: 'Machine Wash Cold' }
        ],
        declarations: [{ title: 'Country of Origin', description: 'China' }]
      },
      'sr-Latn-RS': {
        title: 'Muške sportske kargo pantalone',
        images: ['https://img.kwcdn.com/product/fancy/2b37b82d-be6c-446a-b979-fca02824f73b.jpg'],
        description:
          'Višenamenske kargo pantalone sa više džepova i tkaninom koja upija vlagu. Savršene za sportske aktivnosti i svakodnevno nošenje.',
        specifications: [
          { title: 'Tkanina', description: '95% poliester, 5% spandeks' },
          { title: 'Kroj', description: 'Opušten kroj (Relaxed Fit)' },
          { title: 'Održavanje', description: 'Mašinsko pranje u hladnoj vodi' }
        ],
        declarations: [{ title: 'Zemlja porekla', description: 'Kina' }]
      }
    }
  },
  {
    id: '3',
    rating: 5,
    views: 2,
    sold: 32000,
    categories: [],
    price: 4500,
    quantity: 0,
    sizes: [{ id: 'std', size: 'Standard', qty: 50 }],
    locales: {
      'en-US': {
        title: 'Foldable Multi-Tool Pliers',
        images: ['https://img.kwcdn.com/product/fancy/225e4481-2c31-4797-8d0d-f04c41bfea8f.jpg'],
        description:
          'Compact 12-in-1 multi-tool made from stainless steel. Includes pliers, knife, screwdriver, and bottle opener.',
        specifications: [
          { title: 'Material', description: '420 Stainless Steel' },
          { title: 'Dimensions', description: '10cm x 4cm (Folded)' },
          { title: 'Tools', description: '12 Integrated Functions' }
        ],
        declarations: [
          { title: 'Origin', description: 'Taiwan' },
          { title: 'Safety', description: 'Locking Mechanism Included' }
        ]
      },
      'sr-Latn-RS': {
        title: 'Sklopiva višenamenska klešta',
        images: ['https://img.kwcdn.com/product/fancy/225e4481-2c31-4797-8d0d-f04c41bfea8f.jpg'],
        description:
          'Kompaktni višenamenski alat 12-u-1 napravljen od nerđajućeg čelika. Uključuje klešta, nož, šrafciger i otvarač za flaše.',
        specifications: [
          { title: 'Materijal', description: 'Nerđajući čelik 420' },
          { title: 'Dimenzije', description: '10cm x 4cm (sklopljeno)' },
          { title: 'Alati', description: '12 integrisanih funkcija' }
        ],
        declarations: [
          { title: 'Poreklo', description: 'Tajvan' },
          { title: 'Bezbednost', description: 'Uključen mehanizam za zaključavanje' }
        ]
      }
    }
  },
  {
    id: '4',
    rating: 2,
    views: 52,
    sold: 64000,
    categories: [],
    price: 3200,
    quantity: 0,
    sizes: [
      { id: 's', size: 'S', qty: 10 },
      { id: 'm', size: 'M', qty: 22 },
      { id: 'l', size: 'L', qty: 15 }
    ],
    locales: {
      'en-US': {
        title: 'Outdoor Knee Pad Elbow Pad Set',
        images: ['https://img.kwcdn.com/product/fancy/115266a6-dcf1-4c0f-8ffc-cbc120612455.jpg'],
        description:
          'Ergonomic protective pads for cycling, skating, and tactical sports. High-density foam padding ensures maximum impact absorption.',
        specifications: [
          { title: 'Shell Material', description: 'Impact-Resistant PVC' },
          { title: 'Padding', description: 'EVA Foam' },
          { title: 'Straps', description: 'Adjustable Velcro' }
        ],
        declarations: [
          { title: 'Country of Origin', description: 'China' },
          { title: 'Certification', description: 'CE EN14120' }
        ]
      },
      'sr-Latn-RS': {
        title: 'Set štitnika za kolena i laktove',
        images: ['https://img.kwcdn.com/product/fancy/115266a6-dcf1-4c0f-8ffc-cbc120612455.jpg'],
        description:
          'Ergonomski zaštitni štitnici za biciklizam, vožnju skejtborda i taktičke sportove. Punjenje od pene visoke gustine obezbeđuje maksimalnu apsorpciju udaraca.',
        specifications: [
          { title: 'Materijal školjke', description: 'PVC otporan na udarce' },
          { title: 'Punjenje', description: 'EVA pena' },
          { title: 'Trake', description: 'Podesiva čičak traka' }
        ],
        declarations: [
          { title: 'Zemlja porekla', description: 'Kina' },
          { title: 'Sertifikat', description: 'CE EN14120' }
        ]
      }
    }
  },
  {
    id: '5',
    rating: 4,
    views: 32,
    sold: 64000,
    categories: [],
    price: 9200,
    quantity: 0,
    sizes: [
      { id: 'm', size: 'M', qty: 8 },
      { id: 'l', size: 'L', qty: 14 },
      { id: 'xl', size: 'XL', qty: 20 },
      { id: 'xxl', size: 'XXL', qty: 6 }
    ],
    locales: {
      'en-US': {
        title: "Men's Casual Sports Cargo Pants",
        images: ['https://img.kwcdn.com/product/fancy/ef83d717-db3c-45b7-928d-171034aa092d.jpg'],
        description:
          'Heavy-duty cargo pants with reinforced stitching. Designed for rugged outdoor use while maintaining a stylish, modern cut.',
        specifications: [
          { title: 'Material', description: '100% Cotton Canvas' },
          { title: 'Pockets', description: '6 Utility Pockets' },
          { title: 'Fly Type', description: 'Zipper' }
        ],
        declarations: [{ title: 'Origin', description: 'Bangladesh' }]
      },
      'sr-Latn-RS': {
        title: 'Muške sportske kargo pantalone',
        images: ['https://img.kwcdn.com/product/fancy/ef83d717-db3c-45b7-928d-171034aa092d.jpg'],
        description:
          'Izdržljive kargo pantalone sa ojačanim šavovima. Dizajnirane za robusnu upotrebu na otvorenom uz moderan i stilizovan kroj.',
        specifications: [
          { title: 'Materijal', description: '100% pamučno platno' },
          { title: 'Džepovi', description: '6 funkcionalnih džepova' },
          { title: 'Šlic', description: 'Rajsferšlus' }
        ],
        declarations: [{ title: 'Poreklo', description: 'Bangladeš' }]
      }
    }
  },
  {
    id: '6',
    rating: 3,
    views: 521,
    sold: 32000,
    categories: [],
    price: 1200,
    quantity: 0,
    sizes: [
      { id: 'mini', size: 'Mini', qty: 30 },
      { id: 'std', size: 'Standard', qty: 20 }
    ],
    locales: {
      'en-US': {
        title: 'Foldable Multi-Tool Pliers',
        images: ['https://img.kwcdn.com/product/fancy/be731150-7a91-4aac-afda-410229537235.jpg'],
        description:
          'Budget-friendly multi-tool ideal for quick repairs and camping trips. Features spring-loaded pliers for easy one-handed operation.',
        specifications: [
          { title: 'Material', description: 'Carbon Steel' },
          { title: 'Weight', description: '180g' },
          { title: 'Includes', description: 'Nylon Pouch' }
        ],
        declarations: [{ title: 'Origin', description: 'China' }]
      },
      'sr-Latn-RS': {
        title: 'Sklopiva višenamenska klešta',
        images: ['https://img.kwcdn.com/product/fancy/be731150-7a91-4aac-afda-410229537235.jpg'],
        description:
          'Pristupačan višenamenski alat idealan za brze popravke i kampovanje. Poseduje klešta sa oprugom za lako rukovanje jednom rukom.',
        specifications: [
          { title: 'Materijal', description: 'Ugljenični čelik' },
          { title: 'Težina', description: '180g' },
          { title: 'Sadrži', description: 'Najlonska torbica' }
        ],
        declarations: [{ title: 'Poreklo', description: 'Kina' }]
      }
    }
  },
  {
    id: '7',
    rating: 5,
    views: 5,
    sold: 64000,
    categories: [],
    price: 5500,
    quantity: 0,
    sizes: [
      { id: 'xs', size: 'XS', qty: 5 },
      { id: 's', size: 'S', qty: 15 },
      { id: 'm', size: 'M', qty: 20 }
    ],
    locales: {
      'en-US': {
        title: 'Outdoor Knee Pad Elbow Pad Set',
        images: [
          'https://img.kwcdn.com/product/Fancyalgo/VirtualModelMatting/1e91d6eff0c7f4059ab325e90ff400d7.jpg'
        ],
        description:
          'Professional-grade safety gear set including knee and elbow pads. Breathable mesh lining prevents overheating during intense activity.',
        specifications: [
          { title: 'Protection Level', description: 'Level 2 Impact' },
          { title: 'Lining', description: 'CoolMax Mesh' },
          { title: 'Stitching', description: 'Double Reinforced' }
        ],
        declarations: [
          { title: 'Origin', description: 'Vietnam' },
          { title: 'Usage', description: 'Motorcycle, Skate, BMX' }
        ]
      },
      'sr-Latn-RS': {
        title: 'Set štitnika za kolena i laktove',
        images: [
          'https://img.kwcdn.com/product/Fancyalgo/VirtualModelMatting/1e91d6eff0c7f4059ab325e90ff400d7.jpg'
        ],
        description:
          'Profesionalni set zaštitne opreme koji uključuje štitnike za kolena i laktove. Prozračna mrežasta postava sprečava pregrevanje tokom intenzivnih aktivnosti.',
        specifications: [
          { title: 'Nivo zaštite', description: 'Nivo 2 (Udarci)' },
          { title: 'Postava', description: 'CoolMax mrežica' },
          { title: 'Šavovi', description: 'Dvostruko ojačani' }
        ],
        declarations: [
          { title: 'Poreklo', description: 'Vijetnam' },
          { title: 'Upotreba', description: 'Motociklizam, skejtbord, BMX' }
        ]
      }
    }
  },
  {
    id: '11',
    rating: 3,
    views: 565,
    sold: 64000,
    categories: [],
    price: 2500,
    quantity: 0,
    sizes: [
      { id: 's', size: 'S', qty: 10 },
      { id: 'm', size: 'M', qty: 25 },
      { id: 'l', size: 'L', qty: 30 },
      { id: 'xl', size: 'XL', qty: 15 }
    ],
    locales: {
      'en-US': {
        title: "Cyberpunk-Inspired Men's Hooded Shirt",
        images: ['https://img.kwcdn.com/product/fancy/3b3929b4-62ec-436b-bb3d-48e2941ead54.jpg'],
        description:
          'Futuristic streetwear hooded shirt with asymmetrical cuts and metallic accents. Soft cotton blend for all-day comfort.',
        specifications: [
          { title: 'Style', description: 'Streetwear / Techwear' },
          { title: 'Material', description: 'Cotton/Polyester Blend' },
          { title: 'Pattern', description: 'Solid with Cyber Accents' }
        ],
        declarations: [
          { title: 'Origin', description: 'Korea' },
          { title: 'Instructions', description: 'Wash Inside Out' }
        ]
      },
      'sr-Latn-RS': {
        title: 'Muška duks-majica u Cyberpunk stilu',
        images: ['https://img.kwcdn.com/product/fancy/3b3929b4-62ec-436b-bb3d-48e2941ead54.jpg'],
        description:
          'Futuristička streetwear duks-majica sa asimetričnim krojem i metalik detaljima. Mekana mešavina pamuka za celodnevnu udobnost.',
        specifications: [
          { title: 'Stil', description: 'Streetwear / Techwear' },
          { title: 'Materijal', description: 'Mešavina pamuka i poliestera' },
          { title: 'Dizajn', description: 'Jednobojno sa Cyber detaljima' }
        ],
        declarations: [
          { title: 'Poreklo', description: 'Koreja' },
          { title: 'Uputstvo', description: 'Prati izvrnuto' }
        ]
      }
    }
  }
]
