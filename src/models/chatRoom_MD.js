import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  isEmployeeJoined: {
    type: Boolean,
    default: false,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastEmployeeMessageAt: {
    type: Date,
    default: null, 
  },
}, {
  timestamps: true,
  strict: true,
});

chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ isEmployeeJoined: 1 });

export default mongoose.model('ChatRoom', chatRoomSchema);