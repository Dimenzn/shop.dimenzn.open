import Ad from '../models/adModel.js'
import Language from '../models/languageModel.js'

// ==========================================
// 📢 GET ALL ADS
// ==========================================
/**
 * Fetches all available ad banners from the database.
 */
export const getAds = async (req, res) => {
  try {
    const ads = await Ad.find()

    if (!ads) {
      console.warn('⚠️ [AdsController] No ads found in database.')
      return res.status(404).json({ message: 'AD_NOT_FOUND' })
    }

    res.json(ads)
  } catch (error) {
    console.error('❌ [AdsController] Ads fetch error:', error)
    res.status(500).json({ message: 'AD_FETCH_ERR' })
  }
}

// ==========================================
// ➕ CREATE SINGLE AD
// ==========================================
/**
 * Creates a single new advertisement.
 * Prevents creation if the ID already exists.
 */
export const createAd = async (req, res) => {
  try {
    const { id, locales } = req.body

    // 1. Validate the request body
    if (!id || !locales) {
      console.warn('⚠️ [AdsController] createAd missing required fields.')
      return res.status(400).json({ message: 'VAL_MISSING_FIELDS' })
    }

    // 2. Create and Save the new ad
    const newAd = new Ad({
      id,
      locales
    })

    const savedAd = await newAd.save()

    console.log(`✅ [AdsController] Ad created successfully (ID: ${id})`)
    res.status(201).json(savedAd) // 201 Created
  } catch (error) {
    // Check for duplicate key error (MongoDB Error Code 11000)
    if (error.code === 11000) {
      console.warn(`⚠️ [AdsController] Duplicate Ad creation attempt (ID: ${req.body.id})`)
      return res.status(409).json({ message: 'AD_EXISTS' }) // 409 Conflict
    }

    console.error('❌ [AdsController] Ad creation error:', error)
    res.status(500).json({ message: 'AD_CREATE_ERR' })
  }
}

// ==========================================
// 💾 SAVE BATCH / BULK REPLACE ADS
// ==========================================
/**
 * Replaces the entire Ads collection with a new array from the Admin Panel.
 * Automatically backfills missing locales based on active system languages.
 */
export const saveDataAds = async (req, res) => {
  try {
    const updateAds = req.body

    // 1. Basic Validation
    if (!updateAds || !Array.isArray(updateAds)) {
      console.warn('⚠️ [AdsController] saveDataAds received an invalid payload.')
      return res.status(200).json({ message: 'DATA_UPDATE_MISS' })
    }

    // 2. Fetch Active System Languages
    // We need to know which languages are currently enabled to backfill missing data
    const activeLanguages = await Language.find({ selected: true }).lean()
    const targetLangCodes = activeLanguages.map(l => l.value)

    // Helper: Finds the best existing content to clone into empty language slots
    const getFallbackContent = localesObject => {
      if (!localesObject) return null

      // A. Try English -> B. First Available -> C. Empty Skeleton
      if (localesObject['en-US']) return localesObject['en-US']

      const keys = Object.keys(localesObject)
      if (keys.length > 0) return localesObject[keys[0]]

      // Default Ad Skeleton if no valid data exists
      return {
        title: 'New Ad',
        subtitle: '',
        buttonText: 'Shop Now',
        link: '/',
        image: ''
      }
    }

    // 3. Prepare Data (Backfill Missing Locales)
    const adsToInsert = updateAds.map(ad => {
      // Ensure locales object exists
      if (!ad.locales) ad.locales = {}

      // Identify Source Content
      const sourceData = getFallbackContent(ad.locales)

      // Loop through all active system languages
      targetLangCodes.forEach(langCode => {
        // [CRITICAL] Strict check: Only copy if locale is strictly undefined
        if (!ad.locales[langCode]) {
          // Deep clone source data to the new language slot
          ad.locales[langCode] = JSON.parse(JSON.stringify(sourceData))
        }
      })

      return ad
    })

    // 4. Execute Full Replace
    // Since this is a full "Save Panel" action, we wipe the old list and insert the new one.
    console.log('🔄 [AdsController] Wiping old ads and inserting new dataset...')
    await Ad.deleteMany({})

    if (adsToInsert.length > 0) {
      await Ad.insertMany(adsToInsert)
    }

    console.log('✅ [AdsController] Batch ad update completed successfully.')
    res.status(200).json({ message: 'DATA_SAVE_SUCCESS' })
  } catch (error) {
    console.error('❌ [AdsController] saveDataAds error:', error)
    res.status(500).json({ message: 'DATA_SAVE_ERR' })
  }
}
