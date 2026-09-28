import Language from '../models/languageModel.js'

/**
 * GET Languages
 * Fetches active/selected languages for the frontend.
 * Designed to handle empty databases during initialization.
 */
export const getLanguages = async (req, res) => {
  try {
    // We search for selected languages to bootstrap the UI
    const languages = await Language.find({ selected: true })

    // FIX: Do not return 404 if the array is empty.
    // Return 200 and [] so the Quasar boot sequence can continue to the Setup page.
    res.status(200).json(languages || [])
  } catch (error) {
    // Using the 'error' variable here prevents ESLint build-blocks
    console.error('❌ [Language] Fetch error:', error.message)
    res.status(500).json({ message: 'LANG_FETCH_ERR' })
  }
}
