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
const Size = mongoose.models.Size || mongoose.model('Sizes', sizeSchema);

export default Size;