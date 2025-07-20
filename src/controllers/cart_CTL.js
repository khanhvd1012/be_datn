import cart_MD from "../models/cart_MD"
import cartItem_MD from "../models/cartItem_MD";
import stock_MD from "../models/stock_MD";
import variant_MD from "../models/variant_MD";



export const getOneCart = async (req, res) => {
    try {
        // lấy giỏ hàng của user
        const cart = await cart_MD.findOne({ user_id: req.user.id })
            // populate cart_items với và variant_id
            .populate({
                path: "cart_items",
                populate: [
                    {
                        path: 'variant_id',
                        select: 'price image_url product_id color',
                        populate: [
                            {
                                path: 'product_id',
                                select: 'name'
                            },
                            {
                                path: 'color',
                                select: 'name'
                            }
                        ]
                    },
                    {
                        path: 'size_id',
                        select: 'size'
                    }
                ]
            });

        if (!cart) {
            return res.status(404).json({
                message: "Chưa có sản phẩm trong giỏ hàng"
            });
        }

        // chuyển đổi cart thành plain object để dễ xử lý
        const cartObject = cart.toObject();

        // tính tổng số tiền của giỏ hàng
        const total = cartObject.cart_items.reduce((total, item) => {
            const price = item.variant_id ? item.variant_id.price : 0;
            return total + (price * item.quantity);
        }, 0);

        return res.status(200).json({
            message: "Lấy giỏ hàng thành công",
            data: {
                ...cartObject,
                total
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy giỏ hàng",
            error: error.message
        });
    }
}

// thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
    try {
        let cart = await cart_MD.findOne({ user_id: req.user._id });
        if (!cart) {
            cart = await cart_MD.create({
                user_id: req.user._id,
                cart_items: []
            });
        }

        const items = Array.isArray(req.body) ? req.body : [req.body];
        const addedItems = [];
        const messages = [];

        for (const item of items) {
            const { variant_id, size_id, quantity = 1 } = item;

            // Kiểm tra variant tồn tại
            const variant = await variant_MD.findById(variant_id)
                .populate('product_id', 'name')
                .populate('size', 'size');

            if (!variant) {
                messages.push(`Không tìm thấy biến thể sản phẩm`);
                continue;
            }

            // Kiểm tra size được chọn có trong mảng size của variant không
            if (!variant.size.some(s => s._id.toString() === size_id)) {
                messages.push(`Size không hợp lệ cho sản phẩm ${variant.product_id.name}`);
                continue;
            }

            // Kiểm tra trạng thái và tồn kho
            if (variant.status === 'outOfStock') {
                messages.push(`${variant.product_id.name} đã hết hàng`);
                continue;
            }

            const stock = await stock_MD.findOne({ product_variant_id: variant_id });
            if (!stock || stock.quantity < quantity) {
                messages.push(`${variant.product_id.name} chỉ còn ${stock?.quantity || 0} sản phẩm`);
                continue;
            }

            // Tìm item trong giỏ hàng với cùng variant và size
            let existingItem = await cartItem_MD.findOne({
                cart_id: cart._id,
                variant_id,
                size_id
            });

            if (existingItem) {
                const newQuantity = existingItem.quantity + quantity;
                if (newQuantity > stock.quantity) {
                    messages.push(`${variant.product_id.name} chỉ còn ${stock.quantity} sản phẩm`);
                    continue;
                }
                existingItem.quantity = newQuantity;
                await existingItem.save();
                addedItems.push(existingItem);
            } else {
                const newItem = await cartItem_MD.create({
                    cart_id: cart._id,
                    variant_id,
                    size_id,
                    quantity
                });
                cart.cart_items.push(newItem._id);
                addedItems.push(newItem);
            }
        }

        await cart.save();

        return res.status(200).json({
            message: addedItems.length > 0 ? "Thêm sản phẩm vào giỏ hàng thành công" : "Không thể thêm sản phẩm vào giỏ hàng",
            data: {
                addedItems,
                cart
            },
            messages: messages.length > 0 ? messages : undefined
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi thêm sản phẩm vào giỏ hàng",
            error: error.message
        });
    }
}
export const updateCartItem = async (req, res) => {
    try {
        const variant_id = req.params.id;
        const { quantity } = req.body;

        // Kiểm tra input hợp lệ
        if (!variant_id) {
            return res.status(400).json({
                message: "Thiếu ID biến thể sản phẩm (variant_id)"
            });
        }

        // Kiểm tra quantity hợp lệ
        if (quantity === undefined || quantity === null) {
            return res.status(400).json({
                message: "Thiếu thông tin số lượng (quantity)"
            });
        }

        // Nếu quantity = 0, xóa sản phẩm khỏi giỏ hàng
        if (quantity === 0) {
            const deletedItem = await cartItem_MD.findOneAndDelete({ variant_id });

            if (!deletedItem) {
                return res.status(404).json({
                    message: "Không tìm thấy sản phẩm với biến thể đã chọn trong giỏ hàng"
                });
            }

            // Xóa item khỏi cart
            await cart_MD.updateOne(
                { cart_items: deletedItem._id },
                { $pull: { cart_items: deletedItem._id } }
            );

            return res.status(200).json({
                message: "Đã xóa sản phẩm khỏi giỏ hàng thành công",
                data: deletedItem
            });
        }

        // Kiểm tra quantity phải là số dương
        if (quantity < 0) {
            return res.status(400).json({
                message: "Số lượng phải lớn hơn 0"
            });
        }

        // Kiểm tra trạng thái variant
        const variant = await variant_MD.findById(variant_id).populate('product_id', 'name');
        if (!variant) {
            return res.status(404).json({
                message: "Không tìm thấy biến thể sản phẩm"
            });
        }

        if (variant.status === 'outOfStock') {
            return res.status(400).json({
                message: `${variant.product_id.name} - ${variant.color} size ${variant.size} đã hết hàng`
            });
        }

        // Tìm cart item và populate thông tin variant và product
        const cartItem = await cartItem_MD.findOne({ variant_id })
            .populate({
                path: 'variant_id',
                select: 'color size price image_url product_id',
                populate: {
                    path: 'product_id',
                    select: 'name'
                }
            });

        if (!cartItem) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm với biến thể đã chọn trong giỏ hàng"
            });
        }

        // Kiểm tra tồn kho
        const stock = await stock_MD.findOne({ product_variant_id: variant_id });

        if (quantity > stock.quantity) {
            return res.status(400).json({
                message: `${cartItem.variant_id.product_id.name} chỉ còn ${stock.quantity} sản phẩm trong kho. Không thể thêm số lượng lên ${quantity}`,
            });
        };
        // Kiểm tra tồn kho
        if (!stock || stock.quantity === 0) {
            return res.status(400).json({
                message: `${variant.product_id.name} - ${variant.color} size ${variant.size} đã hết hàng`
            });
        }



        // Cập nhật số lượng nếu tất cả điều kiện đều hợp lệ
        const updatedItem = await cartItem_MD.findOneAndUpdate(
            { variant_id },
            { quantity },
            { new: true, runValidators: true }
        ).populate({
            path: 'variant_id',
            select: 'color size price image_url product_id',
            populate: {
                path: 'product_id',
                select: 'name'
            }
        });

        return res.status(200).json({
            message: "Cập nhật số lượng thành công",
            status: "SUCCESS",
            data: updatedItem
        });

    } catch (error) {
        return res.status(500).json({
            message: "Đã xảy ra lỗi khi cập nhật số lượng sản phẩm trong giỏ hàng",
            error: error.message
        });
    }
};
// Xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = async (req, res) => {
    try {
        // tìm sản phẩm trong giỏ hàng
        const cartItem = await cartItem_MD.findById(req.params.id);

        // kiểm tra sản phẩm có tồn tại trong giỏ hàng không
        if (!cartItem) {
            return res.status(404).json({
                message: "Không tìm thấy sản phẩm trong giỏ hàng"
            });
        }

        // lưu cart_id trước khi xóa
        const cartId = cartItem.cart_id;

        // xóa sản phẩm trong giỏ hàng
        await cartItem_MD.findByIdAndDelete(req.params.id);

        // xóa sản phẩm trong giỏ hàng
        await cart_MD.updateOne(
            { _id: cartId },
            { $pull: { cart_items: req.params.id } }
        );

        return res.status(200).json({
            message: "Xóa sản phẩm khỏi giỏ hàng thành công",
            data: cartItem
        });

    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi xóa sản phẩm khỏi giỏ hàng",
            error: error.message
        });
    }
}