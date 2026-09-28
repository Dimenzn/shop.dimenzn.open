import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'
import dotenv from 'dotenv'

dotenv.config()

// 1. Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// 2. Set up the Multer Storage Engine to pipe directly to Cloudinary
const market = process.env.MARKET_ENV || 'default'
const targetFolder = `dimenzn-shop/sellers/${market}`

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: targetFolder, // 🌟 Now uploads to /rs, /th, or /country dynamically!
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1000, crop: 'limit' }] // Auto-resize massive images to save space
  }
})

// 3. Export the upload middleware
export const uploadMiddleware = multer({ storage: storage })
