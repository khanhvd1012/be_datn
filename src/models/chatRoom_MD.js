import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isEmployeeJoined: {
        type: Boolean,
        default: false
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }
}, { timestamps: true });

export default mongoose.model('ChatRoom', chatRoomSchema);
