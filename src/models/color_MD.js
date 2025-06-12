import mongoose from 'mongoose';

const colorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Tên màu sắc không được để trống"],
        unique: true,
        trim: true
    },
    code: {
        type: String,
        required: [true, "Mã màu không được để trống"],
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

export default mongoose.model('Colors', colorSchema);
