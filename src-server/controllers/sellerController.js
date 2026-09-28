import Language from '../models/languageModel.js'
import Category from '../models/categoryModel.js'

export const getSellerInitData = async (req, res) => {
  try {
    // 1. Sellers only need to know about the ACTIVE languages for their product forms
    const languages = await Language.find({ selected: true }).lean()

    // 2. Sellers need ALL categories (so they can populate empty ones)
    const categories = await Category.find().lean()

    res.status(200).json({ languages, categories })
  } catch (error) {
    console.error('❌ [Seller] Init Data Fetch Error:', error)
    res.status(500).json({ message: 'GEN_UNEXPECTED' })
  }
}
