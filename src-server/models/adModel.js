import mongoose from 'mongoose'

// ==========================================
// 📢 ADVERTISEMENT MODEL
// ==========================================
/**
 * Schema for promotional banners and advertisements.
 * Uses a flexible 'locales' object to store multi-language content.
 */
const adSchema = new mongoose.Schema({
  // Unique custom identifier (used by the frontend and URLs)
  id: {
    type: String,
    required: true,
    unique: true
  },

  // Dynamic dictionary mapping language codes to their translated content.
  // Example structure: { 'en-US': { title: 'Sale', link: '/shop', image: 'url' } }
  locales: {
    type: Object,
    default: {
      'en-US': {
        title: '#',
        link: '#',
        image: '#',
        logo: '#'
      }
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model('Ad', adSchema)
