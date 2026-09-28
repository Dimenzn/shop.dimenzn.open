import { v2 as cloudinary } from 'cloudinary'
import Product from '../models/productModel.js'

// 🌟 ADD 'forceInstant = false' TO THE FUNCTION
export const runCloudinaryCleanup = async (forceInstant = false) => {
  try {
    console.log(`🧹 [Cloudinary] Starting Sweep (Force Instant: ${forceInstant})...`)

    const products = await Product.find()
    const usedUrls = new Set()

    products.forEach(prod => {
      if (prod.images) prod.images.forEach(img => usedUrls.add(img))

      if (prod.locales) {
        Object.values(prod.locales).forEach(localeData => {
          if (localeData.images) {
            localeData.images.forEach(img => usedUrls.add(img))
          }
        })
      }
    })

    // 🌟 THE FIX: Isolate the search to this specific market's folder
    const market = process.env.MARKET_ENV || 'default'
    const targetFolder = `dimenzn-shop/sellers/${market}`

    const cloudResponse = await cloudinary.api.resources({
      type: 'upload',
      prefix: targetFolder, // 🔒 Only sweep our specific sub-folder!
      max_results: 500
    })

    const orphansToDelete = []

    // 🌟 THE FIX: If forced, the threshold is RIGHT NOW. Otherwise, 24 hours ago.
    const timeThreshold = forceInstant ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000)

    cloudResponse.resources.forEach(cloudImg => {
      if (!usedUrls.has(cloudImg.secure_url)) {
        const createdAt = new Date(cloudImg.created_at)

        // 🌟 Uses the new dynamic threshold
        if (createdAt < timeThreshold) {
          orphansToDelete.push(cloudImg.public_id)
        }
      }
    })

    if (orphansToDelete.length > 0) {
      console.log(`🗑️ [Cloudinary] Found ${orphansToDelete.length} orphans. Deleting...`)
      await cloudinary.api.delete_resources(orphansToDelete, { invalidate: true })
    } else {
      console.log(`✨ [Cloudinary] Storage is clean. No orphans found.`)
    }

    return orphansToDelete.length
  } catch (error) {
    console.error('❌ [Cloudinary] Cleanup Sweep Failed:', error)
    throw error
  }
}
