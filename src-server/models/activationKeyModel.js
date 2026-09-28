import mongoose from 'mongoose'

const activationKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    // We add a 'type' just in case you want to use keys for other things later (like discounts)
    type: {
      type: String,
      default: 'seller_upgrade'
    },
    isUsed: {
      type: Boolean,
      default: false
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    usedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true // The Admin who generated it
    }
  },
  { timestamps: true }
)

const ActivationKey = mongoose.model('ActivationKey', activationKeySchema)
export default ActivationKey
