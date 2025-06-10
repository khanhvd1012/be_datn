// Add token blacklist array
const tokenBlacklist = [];
// Add middleware to check blacklisted tokens
export const checkTokenBlacklist = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (token && tokenBlacklist.includes(token)) {
        return res.status(401).json({ message: "Token đã bị vô hiệu hóa" });
    }

    next();
}