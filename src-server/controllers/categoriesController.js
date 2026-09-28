import Category from '../models/categoryModel.js'
import Language from '../models/languageModel.js'
import Product from '../models/productModel.js' // 🌟 Added Product model
import User from '../models/userModel.js' // 🌟 Added User model

// ==========================================
// 🔍 GET ALL CATEGORIES (With Dynamic Counting)
// ==========================================
export const getCategories = async (req, res) => {
  try {
    // 1. Fetch all categories as plain JS objects
    const categories = await Category.find().lean()

    // 2. 🛡️ ADMIN & PLATFORM BYPASS: Admins must see ALL categories to manage them.
    // Sellers no longer use this route; they get their data from /seller/initData
    if (req.user?.role === 'admin' || req.user?.role === 'platform' || req.query.admin === 'true') {
      return res.status(200).json(categories || [])
    }

    // =======================================================
    // 🌟 3. PUBLIC FRONTEND LOGIC: Count & Filter
    // =======================================================

    // A. Find blocked sellers so we don't count their products!
    const blockedSellers = await User.find({
      $or: [
        { 'storeProfile.accountStatus': 'suspended' },
        { 'storeProfile.billingStatus': 'restricted' }
      ]
    }).distinct('_id')

    // B. Run a highly efficient MongoDB Aggregation to count IN-STOCK products per category
    const activeProductCounts = await Product.aggregate([
      {
        $match: {
          sellerId: { $nin: blockedSellers }, // Ignore suspended sellers
          $or: [
            { quantity: { $gt: 0 } }, // Must have general stock
            { 'sizes.qty': { $gt: 0 } } // OR must have size stock
          ]
        }
      },
      { $unwind: '$categories' }, // Split the [rootId, subId] array into separate documents
      {
        $group: {
          _id: '$categories', // Group by the Category ID
          count: { $sum: 1 } // Count them!
        }
      }
    ])

    // C. Convert the aggregation result into a fast lookup dictionary
    // e.g., { "cat_electronics": 45, "sub_elec_phones": 12 }
    const countMap = {}
    activeProductCounts.forEach(item => {
      countMap[item._id] = item.count
    })

    // D. Map the counts to our categories and filter out the empty ones
    const publicCategories = categories
      .map(cat => {
        // Process subcategories first
        const populatedSubs = (cat.sub || [])
          .map(sub => ({
            ...sub,
            productCount: countMap[sub.id] || 0
          }))
          .filter(sub => sub.productCount > 0) // Hide empty subcategories!

        // Get root category count
        const rootCount = countMap[cat.id] || 0

        return {
          ...cat,
          sub: populatedSubs,
          productCount: rootCount
        }
      })
      .filter(cat => cat.productCount > 0 || cat.sub.length > 0) // Hide empty root categories!

    // Send the cleanly filtered, pre-counted array to the frontend
    res.status(200).json(publicCategories || [])
  } catch (error) {
    console.error('❌ [Category] Fetch error:', error.message)
    res.status(500).json({ message: 'CAT_FETCH_ERR' })
  }
}

// ==========================================
// 💾 SAVE BATCH CATEGORIES (Admin)
// ==========================================
export const saveDataCategories = async (req, res) => {
  try {
    const updateCategories = req.body

    if (!updateCategories || !Array.isArray(updateCategories)) {
      return res.status(200).json({ message: 'DATA_UPDATE_MISS' })
    }

    const activeLanguages = await Language.find({ selected: true }).lean()
    const targetLangCodes = activeLanguages.map(l => l.value)

    const getFallbackTitle = titleObject => {
      if (!titleObject) return 'Untitled'
      if (titleObject['en-US']) return titleObject['en-US']
      const keys = Object.keys(titleObject)
      return keys.length > 0 ? titleObject[keys[0]] : 'Untitled'
    }

    const categoriesToInsert = updateCategories.map(cat => {
      if (!cat.title) cat.title = {}
      const catSourceTitle = getFallbackTitle(cat.title)

      targetLangCodes.forEach(langCode => {
        if (!cat.title[langCode]) cat.title[langCode] = catSourceTitle
      })

      if (cat.sub && Array.isArray(cat.sub)) {
        cat.sub.forEach(subCat => {
          if (!subCat.title) subCat.title = {}
          const subSourceTitle = getFallbackTitle(subCat.title)
          targetLangCodes.forEach(langCode => {
            if (!subCat.title[langCode]) subCat.title[langCode] = subSourceTitle
          })
        })
      }
      return cat
    })

    await Category.deleteMany({})
    if (categoriesToInsert.length > 0) {
      await Category.insertMany(categoriesToInsert)
    }

    console.log(`✅ [Category] ${categoriesToInsert.length} categories saved/updated.`)
    res.status(200).json({ message: 'DATA_SAVE_SUCCESS' })
  } catch (error) {
    console.error('❌ [Category] Save error:', error.message)
    res.status(500).json({ message: 'DATA_SAVE_ERR' })
  }
}

// ==========================================
// ➕ CREATE SINGLE CATEGORY
// ==========================================
export const createCategory = async (req, res) => {
  try {
    const { link, id, title, sub } = req.body

    if (!id || !title) {
      return res.status(400).json({ message: 'VAL_MISSING_FIELDS' })
    }

    const newCategory = new Category({ link, id, title, sub })
    const savedCategory = await newCategory.save()

    res.status(201).json(savedCategory)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'CAT_EXISTS' })
    }
    console.error('❌ [Category] Creation error:', error.message)
    res.status(500).json({ message: 'CAT_CREATE_ERR' })
  }
}
