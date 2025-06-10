import cart_MD from "../models/cart_MD"
import cartItem_MD from "../models/cartItem_MD";


export const getOneCart = async (req, res) => {
    try {
        // Lấy giỏ hàng của user
        const cart = await cart_MD.findOne({ user_id: req.user.id })
            // Populate cart_items với product_id và variant_id
            .populate({
                path: "cart_items",
                populate: [
                    {
                        path: 'product_id',
                        select: 'name',
                    },
                    {
                        path: 'variant_id',
                        select: 'color size price image_url',
                    }
                ]
            });

        if (!cart) {
            return res.status(404).json({
                message: "Không tìm thấy giỏ hàng"
            });
        }

        // Chuyển đổi cart thành plain object để dễ xử lý
        const cartObject = cart.toObject();

        // Tính tổng số tiền của giỏ hàng
        const totalAmount = cartObject.cart_items.reduce((total, item) => {
            const price = item.variant_id ? item.variant_id.price : 0;
            return total + (price * item.quantity);
        }, 0);

        return res.status(200).json({
            message: "Lấy giỏ hàng thành công",
            data: {
                ...cartObject,
                totalAmount
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy giỏ hàng",
            error: error.message
        });
    }
}

export const addToCart = async (req, res) => {
    try {
        const { user_id } = req.user;
        const items = Array.isArray(req.body) ? req.body : [req.body];
        // Kiểm tra xem items có phải là mảng không

        let cart = await cart_MD.findOne({ user_id });

        if (!cart) {
            cart = await cart_MD.create({
                user_id,
                cart_items: []
            });
        }

        const addedItems = [];
        // Thêm các sản phẩm vào giỏ hàng
        for (const item of items) {
            // Lấy product_id, variant_id và quantity từ item
            const { product_id, variant_id, quantity = 1 } = item;
            // Tìm sản phẩm trong giỏ hàng
            let existingItem = await cartItem_MD.findOne({
                cart_id: cart._id,
                product_id,
                variant_id
            });
            // Nếu sản phẩm đã tồn tại trong giỏ hàng, cập nhật số lượng
            if (existingItem) {
                existingItem.quantity += quantity;
                await existingItem.save();
                addedItems.push(existingItem);
            } else {
                // Nếu sản phẩm chưa tồn tại trong giỏ hàng, tạo mới
                const newItem = await cartItem_MD.create({
                    cart_id: cart._id,
                    product_id,
                    variant_id,
                    quantity
                });
                cart.cart_items.push(newItem._id);
                addedItems.push(newItem);
            }
        }

        await cart.save();
        // Lưu giỏ hàng vào database

        return res.status(200).json({
            message: "Thêm sản phẩm vào giỏ hàng thành công",
            data: {
                addedItems,
                cart
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi thêm sản phẩm vào giỏ hàng",
            error: error.message
        });
    }
}

export const updateCartItem = async (req, res) => {
    try {
        const { quantity } = req.body;
        // Tìm sản phẩm trong giỏ hàng và cập nhật số lượng
        const cartItem = await cartItem_MD.findByIdAndUpdate(
            req.params.id,
            { quantity },
            { new: true }
        );

        if (!cartItem) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm trong giỏ hàng"
            });
        }

        return res.status(200).json({
            data: cartItem
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi cập nhật số lượng sản phẩm trong giỏ hàng",
            error: error.message
        });
    }
}
// Xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = async (req, res) => {
    try {
        const cartItem = await cartItem_MD.findByIdAndDelete(req.params.id);
        // Kiểm tra xem sản phẩm có tồn tại trong giỏ hàng không
        if (!cartItem) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm trong giỏ hàng"
            });
        }

        return res.status(200).json({
            data: cartItem
        });

    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi xóa sản phẩm khỏi giỏ hàng",
            error: error.message
        });
    }
}