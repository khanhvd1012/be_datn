import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Products'
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export default mongoose.model('Sizes', sizeSchema);
