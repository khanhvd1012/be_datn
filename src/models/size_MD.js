import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
    size: {
        type: Number,
        required: true,
        unique: true,
    },
}, {
    timestamps: true
});

export default mongoose.model('Sizes', sizeSchema);
