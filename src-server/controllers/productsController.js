import Product from '../models/productModel.js'
import User from '../models/userModel.js'
import Order from '../models/orderModel.js'
import jwt from 'jsonwebtoken'

// ==========================================
// 🛡️ SECURITY HELPER: THE BLACKLIST
// ==========================================
/**
 * Fetches an array of Seller IDs who are either
 * manually suspended by an Admin or locked out due to unpaid bills.
 */
const getBlockedSellers = async () => {
  return await User.find({
    $or: [
      { 'storeProfile.accountStatus': 'suspended' },
      { 'storeProfile.billingStatus': 'restricted' }
    ]
  }).distinct('_id')
}

// ==========================================
// 📊 GET PRODUCT STATS (For Filters)
// ==========================================
/**
 * Retrieves statistical data for a specific category.
 * Primarily used to find the maximum price to set the boundaries on the Shop filter slider.
 */
export const getProductStats = async (req, res) => {
  try {
    const { category } = req.query
    const blockedSellers = await getBlockedSellers()

    // 1. Build the filter (Excluding Banned Sellers!)
    const query = { sellerId: { $nin: blockedSellers } }

    if (category && category !== 'all') {
      query.categories = category
    }

    // 🌟 REFACTOR: Safely query the root 'price' field!
    const expensiveItem = await Product.findOne(query).sort({ price: -1 }).select('price')

    const maxPrice = expensiveItem?.price || 2000

    res.status(200).json({ maxPrice })
  } catch (error) {
    console.error('❌ [Products] Get Stats Error:', error)
    // Failsafe fallback so the frontend slider doesn't break
    res.status(200).json({ maxPrice: 2000 })
  }
}

// ==========================================
// 🛍️ GET MULTIPLE PRODUCTS (Home & Shop)
// ==========================================
/**
 * Multi-purpose endpoint for fetching products.
 * Mode 1: Returns 'Popular', 'Newest' (paginated), and 'Premium' arrays for the Home Page.
 * Mode 2: Returns paginated, filtered, and sorted products for the Shop Page.
 */
export const getProducts = async (req, res) => {
  try {
    const blockedSellers = await getBlockedSellers()
    const baseQuery = { sellerId: { $nin: blockedSellers } }

    // 🌟 REUSABLE: Query object to strictly enforce IN-STOCK items only
    const inStockQuery = {
      ...baseQuery,
      $or: [
        { quantity: { $gt: 0 } }, // Simple product inventory
        { 'sizes.qty': { $gt: 0 } } // Variable size inventory
      ]
    }

    // --------------------------------------------------
    // MODE 1: HOME PAGE DASHBOARD
    // --------------------------------------------------
    if (req.query.home === 'true') {
      const popularLimit = 18

      // 🌟 NEW: Pagination specifically for the New Arrivals feed
      const newestPage = Number(req.query.newestPage) || 1
      const newestLimit = Number(req.query.newestLimit) || 18

      // 1. Aggregation Pipeline for "Premium Picks" (In-Stock Only)
      const premiumPipeline = [
        { $match: inStockQuery }, // Use the reusable in-stock query
        { $sort: { views: -1 } },
        {
          $group: {
            _id: '$sellerId',
            bestProduct: { $first: '$$ROOT' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'sellerData'
          }
        },
        { $unwind: '$sellerData' },
        { $sort: { 'sellerData.storeProfile.trustScore': -1 } },
        { $limit: 9 },
        { $replaceRoot: { newRoot: '$bestProduct' } }
      ]

      // Fetch all three arrays concurrently
      const [popular, newest, premiumRaw] = await Promise.all([
        // 🌟 POPULAR: Use inStockQuery so out-of-stock items never appear here
        Product.find(inStockQuery)
          .select('-__v')
          .sort({ views: -1, rating: -1 })
          .limit(popularLimit)
          .populate('sellerId', 'storeProfile.storeName storeProfile.trustScore'),

        // 🌟 NEWEST: Allow all items (baseQuery), but add skip/limit for lazy loading
        Product.find(baseQuery)
          .select('-__v')
          .sort({ createdAt: -1 })
          .skip((newestPage - 1) * newestLimit)
          .limit(newestLimit)
          .populate('sellerId', 'storeProfile.storeName storeProfile.trustScore'),

        // PREMIUM: Aggregation handles its own logic
        Product.aggregate(premiumPipeline)
      ])

      // Populate seller info for the premium array
      const premium = await Product.populate(premiumRaw, {
        path: 'sellerId',
        select: 'storeProfile.storeName storeProfile.trustScore storeProfile.storeLogo'
      })

      // We also need to send back pagination data for the New Arrivals feed so the frontend knows when to stop lazy-loading
      const totalNewestCount = await Product.countDocuments(baseQuery)
      const newestPagination = {
        currentPage: newestPage,
        totalPages: Math.ceil(totalNewestCount / newestLimit),
        totalItems: totalNewestCount
      }

      return res.status(200).json({ popular, newest, premium, newestPagination })
    }

    // --------------------------------------------------
    // MODE 2: SHOP PAGE & SELLER STOREFRONT
    // --------------------------------------------------
    const {
      page = 1,
      limit = 20,
      category,
      seller,
      sort,
      minPrice,
      maxPrice,
      search,
      locale = 'en-US'
    } = req.query

    // Start with the blacklist filter
    const query = { ...baseQuery }

    // A. Category Filter
    if (category && category !== 'all') {
      query.categories = category
    }

    // B. Seller Filter
    if (seller) {
      query.sellerId = seller
    }

    // C. Search (Matches localized title)
    if (search) {
      query[`locales.${locale}.title`] = { $regex: search, $options: 'i' }
    }

    // 🌟 REFACTOR: D. Price Range Filter (Queries root 'price')
    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }

    // 🌟 REFACTOR: E. Sorting Logic (Sorts by root 'price')
    let sortOption = { createdAt: -1 } // Default: Newest

    if (sort === 'oldest') {
      sortOption = { createdAt: 1 }
    } else if (sort === 'price_asc') {
      sortOption = { price: 1 }
    } else if (sort === 'price_desc') {
      sortOption = { price: -1 }
    } else if (sort === 'popular') {
      sortOption = { views: -1 }
    }

    // F. Execute Query & Count
    const products = await Product.find(query)
      .sort(sortOption)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('sellerId', 'storeProfile.storeName storeProfile.trustScore')

    const count = await Product.countDocuments(query)

    return res.status(200).json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalProducts: count
    })
  } catch (error) {
    console.error('❌ [Products] Fetch error:', error)
    res.status(500).json({ message: 'PROD_FETCH_ERR' })
  }
}

// ==========================================
// 🔍 GET SINGLE PRODUCT
// ==========================================
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params

    // 🌟 REFACTORED: Fetch the product AND the seller in one trip!
    let product = await Product.findOne({ id: id })
      .populate('sellerId', 'storeProfile') // Tells Mongoose to swap the ID string for the actual user object
      .lean() // Returns a plain JS object (Perfect for injecting custom flags!)

    if (!product) {
      return res.status(404).json({ message: 'PROD_NOT_FOUND' })
    }

    // 🌟 DEADBOLT: Check the populated seller data for suspensions
    if (product.sellerId) {
      const sellerProfile = product.sellerId.storeProfile

      if (
        sellerProfile?.accountStatus === 'suspended' ||
        sellerProfile?.billingStatus === 'restricted'
      ) {
        console.warn(
          `⚠️ [Storefront] Blocked access to product from suspended seller: ${product.sellerId._id}`
        )
        return res.status(404).json({ message: 'PROD_NOT_FOUND' })
      }
    }

    // =========================================================
    // 🛡️ FRONTEND INTERCEPTOR FLAG: Check Purchase History
    // =========================================================
    product.canReview = false // Default to false

    let currentUserId = req.user?._id
    let currentUserEmail = req.user?.email

    // Manually peek at the token since /open routes bypass auth middleware
    if (
      !currentUserId &&
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      try {
        const token = req.headers.authorization.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET)
        currentUserId = decoded.id || decoded._id
        currentUserEmail = decoded.email // 🌟 Grab the email too!
      } catch {
        // Token invalid/expired, ignore silently
      }
    }

    // 🌟 THE FIX: Check for EITHER the User ID OR the Contact Email
    if (currentUserId || currentUserEmail) {
      const hasPurchased = await Order.exists({
        $or: [{ user: currentUserId }, { 'contactInfo.email': currentUserEmail }],
        'items.productId': product.id,
        status: 'delivered'
      })

      product.canReview = !!hasPurchased
    }
    // =========================================================

    res.status(200).json(product)
  } catch (error) {
    console.error('❌ [Products] Fetch single product error:', error)
    res.status(500).json({ message: 'PROD_FETCH_ERR' })
  }
}

// ==========================================
// 📦 BATCH FETCH PRODUCTS BY IDs
// ==========================================
export const getProductsByIds = async (req, res) => {
  try {
    const { ids } = req.query

    if (!ids) {
      return res.status(400).json({ message: 'IDS_REQUIRED' })
    }

    const idArray = ids.split(',')
    const blockedSellers = await getBlockedSellers()

    // 🌟 DEADBOLT: Automatically strip out items from suspended sellers in the cart!
    let products = await Product.find({
      id: { $in: idArray },
      sellerId: { $nin: blockedSellers }
    }).lean()

    const sellerIds = [...new Set(products.map(p => p.sellerId).filter(Boolean))]

    if (sellerIds.length > 0) {
      const sellers = await User.find({ _id: { $in: sellerIds } })
        .select('storeProfile')
        .lean()

      const sellerMap = {}
      sellers.forEach(seller => {
        sellerMap[seller._id.toString()] = seller
      })

      products = products.map(product => {
        if (product.sellerId && sellerMap[product.sellerId.toString()]) {
          product.sellerData = sellerMap[product.sellerId.toString()]
        }
        return product
      })
    }

    res.status(200).json(products)
  } catch (error) {
    console.error('❌ [Products] Batch Fetch Error:', error)
    res.status(500).json({ message: 'BATCH_FETCH_ERR' })
  }
}

// ==========================================
// ➕ CREATE SINGLE PRODUCT
// ==========================================
export const createProduct = async (req, res) => {
  try {
    // 🌟 REFACTOR: Destructure root-level financial/stock fields!
    const { id, rating, views, sold, locales, price, discountPrice, quantity, sizes } = req.body

    if (!id || !locales || !locales['en-US'] || !locales['en-US'].title) {
      console.warn('⚠️ [Products] Missing required fields for creation.')
      return res.status(400).json({ message: 'VAL_MISSING_FIELDS' })
    }

    const sellerId = req.user?.role === 'seller' ? req.user._id : null

    // 🌟 REFACTOR: Pass root fields to Mongoose
    const newProduct = new Product({
      id,
      sellerId,
      rating,
      views,
      sold,
      locales,
      price: price || 0,
      discountPrice: discountPrice || 0,
      quantity: quantity || 0,
      sizes: sizes || []
    })

    const savedProduct = await newProduct.save()

    console.log(`✅ [Products] Product created (ID: ${id}, Seller: ${sellerId || 'Platform'})`)
    res.status(201).json(savedProduct)
  } catch (error) {
    if (error.code === 11000) {
      console.warn(`⚠️ [Products] Duplicate creation attempt (ID: ${req.body.id})`)
      return res.status(409).json({ message: 'PROD_EXISTS' })
    }
    console.error('❌ [Products] Creation error:', error)
    res.status(500).json({ message: 'PROD_CREATE_ERR' })
  }
}

// ==========================================
// ⭐ RATE / REVIEW PRODUCT
// ==========================================
export const rateProduct = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body
    const userId = req.user._id

    if (!productId || !rating) {
      return res.status(400).json({ message: 'PROD_RATE_REQ' })
    }

    // 🌟 1. DEFINE THE TRUST SCORE MATRIX
    // This controls exactly how much SR a seller gains or loses per star
    const SR_MATRIX = {
      5: 2, // Great = +2 SR
      4: 1, // Good = +1 SR
      3: 0, // Neutral = 0 SR
      2: -2, // Bad = -2 SR
      1: -5 // Terrible = -5 SR
    }

    const product = await Product.findOne({ id: productId })
    if (!product) {
      return res.status(404).json({ message: 'PROD_NOT_FOUND_SINGLE' })
    }

    // =========================================================
    // 🛡️ THE VERIFIED PURCHASE GUARD
    // =========================================================
    // Query the database to see if this exact user bought this exact product
    // AND that the order actually arrived at their house.
    const hasPurchased = await Order.exists({
      user: userId,
      'items.productId': productId,
      status: 'delivered'
    })

    if (!hasPurchased) {
      console.warn(`🛑 [Reviews] User ${userId} tried to rate unpurchased product ${productId}`)
      return res.status(403).json({ message: 'RATE_MUST_BUY' })
    }
    // =========================================================

    const user = await User.findById(userId)
    let displayName = 'Verified Customer'

    if (user) {
      const hasName =
        (user.firstName && user.firstName.trim()) || (user.lastName && user.lastName.trim())
      if (hasName) {
        displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      } else {
        displayName = null
      }
    }

    const reviewData = {
      userId: userId,
      userName: displayName,
      rating: rating,
      comment: comment || '',
      date: new Date()
    }

    // 🌟 2. INTERCEPT THE OLD RATING (For the Delta calculation)
    let oldRating = null
    const existingRatingIndex = product.ratings.findIndex(
      r => r.userId.toString() === userId.toString()
    )

    if (existingRatingIndex > -1) {
      // Grab the historical star rating before we overwrite it!
      oldRating = product.ratings[existingRatingIndex].rating
      product.ratings[existingRatingIndex] = reviewData
    } else {
      product.ratings.push(reviewData)
    }

    // Calculate new product average
    const totalRating = product.ratings.reduce((acc, item) => item.rating + acc, 0)
    product.rating = Math.round((totalRating / product.ratings.length) * 10) / 10

    const updatedProduct = await product.save()
    console.log(`⭐ [Products] Product ${productId} rated ${rating}/5 by user ${userId}`)

    // =========================================================
    // 🌟 3. THE TRUST SCORE ENGINE (Review Delta)
    // =========================================================
    // Only apply SR changes if the product actually belongs to a third-party seller
    if (product.sellerId) {
      // Calculate how many points the new rating is worth, and what the old one was worth
      const newImpact = SR_MATRIX[rating] || 0
      const oldImpact = oldRating ? SR_MATRIX[oldRating] || 0 : 0

      // Calculate the difference!
      // If they go from 5 stars (+2) to 1 star (-5), the delta is -7.
      const srDelta = newImpact - oldImpact

      if (srDelta !== 0) {
        const seller = await User.findById(product.sellerId)

        if (seller && seller.storeProfile) {
          // Remember the Falsy Zero fix! (??)
          const currentScore = seller.storeProfile.trustScore ?? 1500

          let newScore = currentScore + srDelta

          // Enforce the Hard Caps
          if (newScore > 5000) newScore = 5000
          if (newScore < 0) newScore = 0

          seller.storeProfile.trustScore = newScore
          await seller.save()

          console.log(
            `⚖️ [Trust System] Review edited/added. Delta: ${srDelta > 0 ? '+' : ''}${srDelta} SR. Seller ${seller._id} is now at ${newScore} SR.`
          )
        }
      }
    }

    res.status(200).json(updatedProduct)
  } catch (error) {
    console.error('❌ [Products] Rating error:', error)
    res.status(500).json({ message: 'PROD_RATE_ERR' })
  }
}

// ==========================================
// 👁️ INCREMENT PRODUCT VIEW
// ==========================================
export const incrementProductView = async (req, res) => {
  try {
    const { productId } = req.body

    if (!productId) {
      return res.status(400).json({ message: 'SILENT' })
    }

    await Product.findOneAndUpdate({ id: productId }, { $inc: { views: 1 } })
    res.status(200).send()
  } catch (error) {
    console.error('❌ [Products] View increment error:', error)
    res.status(500).send()
  }
}

// ==========================================
// 🏪 GET SELLER'S PRODUCTS
// ==========================================
export const getSellerProducts = async (req, res) => {
  try {
    if (!req.user || !['seller', 'admin', 'platform'].includes(req.user.role)) {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    const { page = 1, limit = 10, search = '' } = req.query

    // 🌟 GOD MODE LOGIC: If an admin passes a targetSellerId, use that instead!
    const targetSellerId =
      req.user.role === 'admin' && req.query.targetSellerId
        ? req.query.targetSellerId
        : req.user._id

    const query = { sellerId: targetSellerId }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      query['$or'] = [{ id: searchRegex }, { 'locales.en-US.title': searchRegex }]
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))

    const count = await Product.countDocuments(query)

    res.status(200).json({
      success: true,
      products,
      currentPage: Number(page),
      totalProducts: count
    })
  } catch (error) {
    console.error('❌ [Products] Seller fetch error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

// ==========================================
// 🏪 SAVE BATCH SELLER PRODUCTS
// ==========================================
export const saveSellerBatchProducts = async (req, res) => {
  try {
    if (!req.user || !['seller', 'admin', 'platform'].includes(req.user.role)) {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    const { updated, deleted } = req.body

    // 🌟 GOD MODE LOGIC
    const targetSellerId =
      req.user.role === 'admin' && req.query.targetSellerId
        ? req.query.targetSellerId
        : req.user._id

    // 1. Process Updates
    if (updated && updated.length > 0) {
      for (const prod of updated) {
        await Product.findOneAndUpdate(
          { id: prod.id, sellerId: targetSellerId },
          {
            $set: {
              locales: prod.locales,
              categories: prod.categories,
              price: prod.price,
              discountPrice: prod.discountPrice,
              quantity: prod.quantity,
              sizes: prod.sizes
            }
          }
        )
      }
    }

    // 2. Process Deletions
    if (deleted && deleted.length > 0) {
      await Product.deleteMany({ id: { $in: deleted }, sellerId: targetSellerId })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('❌ [Products] Seller batch save error:', error)
    res.status(500).json({ message: 'GEN_ERR' })
  }
}

// ==========================================
// 🏪 CREATE BATCH SELLER PRODUCTS
// ==========================================
export const createSellerBatchProducts = async (req, res) => {
  try {
    if (!req.user || !['seller', 'admin', 'platform'].includes(req.user.role)) {
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }
    const { products } = req.body
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ message: 'VAL_MISSING_FIELDS' })
    }

    // 🌟 GOD MODE LOGIC
    const targetSellerId =
      req.user.role === 'admin' && req.query.targetSellerId
        ? req.query.targetSellerId
        : req.user._id

    // 🌟 THE FIX: Check if the current actor is the Platform
    const isPlatformUser =
      req.user.role === 'platform' ||
      (req.user.role === 'admin' && req.query.targetSellerId === req.user._id)

    const productsToSave = products.map(p => ({
      ...p,
      sellerId: targetSellerId,
      // 🌟 Inject the Digital / Platform flags here!
      productType: isPlatformUser ? 'digital' : 'physical',
      isPlatformService: isPlatformUser,
      price: p.price || 0,
      discountPrice: p.discountPrice || 0,
      quantity: p.quantity || 0,
      sizes: p.sizes || []
    }))

    await Product.insertMany(productsToSave)

    res.status(201).json({ success: true })
  } catch (error) {
    console.error('❌ [Products] Seller batch create error:', error)
    res.status(500).json({ message: 'PROD_CREATE_ERR' })
  }
}
