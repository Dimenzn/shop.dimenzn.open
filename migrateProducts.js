import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Product from './src-server/models/productModel.js' // Verify this path!

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI // Make sure this matches your .env file

async function migrate() {
  try {
    console.log('⏳ Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected!')

    const products = await Product.find({})
    console.log(`📦 Found ${products.length} products to migrate. Processing...`)

    let updatedCount = 0

    for (const p of products) {
      const locales = p.locales || {}
      // Safely grab the first available locale as the "source of truth"
      const fallbackLocale = locales['en-US'] || Object.values(locales)[0] || {}

      // 1. Copy the data to the ROOT level
      p.price = fallbackLocale.price || 0
      p.discountPrice = fallbackLocale.discountPrice || 0
      p.quantity = fallbackLocale.quantity || 0
      p.sizes = fallbackLocale.sizes || []

      // 2. (Optional but recommended) Delete the old data from locales to save space
      for (const langKey in locales) {
        delete locales[langKey].price
        delete locales[langKey].discountPrice
        delete locales[langKey].quantity
        delete locales[langKey].sizes
      }

      // Tell Mongoose the locales object was modified so it saves properly
      p.markModified('locales')

      // 3. Save the updated product
      await p.save()
      updatedCount++
    }

    console.log(`🎉 Migration Complete! Successfully upgraded ${updatedCount} products.`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration Failed:', error)
    process.exit(1)
  }
}

migrate()
