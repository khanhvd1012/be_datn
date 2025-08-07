import cart_MD from "../models/cart_MD";
import stock_MD from "../models/stock_MD";
import variant_MD from "../models/variant_MD";
import cart_MD from "../models/cart_MD";
import stock_MD from "../models/stock_MD";
import Notification from "../models/notification_MD";
import cartItem_MD from "../models/cartItem_MD";
import User from "../models/auth_MD";

export const getOneCart = async (req, res) => {
    try {
        const user = req.user;
        const cart = await cart_MD.findOne({ user_id: req.user._id }).populate({
            path: "cart_items",
            populate: {
                path: "variant_id",
                populate: [
                    { path: "product_id", select: "name" },
                    { path: "color", select: "name" },
                    { path: "size", select: "size" }
                ]
            }
        });

        if (!cart) {
            return res.status(200).json({
                message: "Lấy giỏ hàng thành công",
                data: {
                    cart_items: [],
                    returning_items: [],
                    total: 0
                }
            });
        }

        let total = 0;
        const activeItems = [];
        const returningItems = [];
        const newNotifications = []; // Lưu thông báo mới tạo

        for (const item of cart.cart_items) {
            const stock = await stock_MD.findOne({ product_variant_id: item.variant_id._id });

            // ✅ Case 1: Sản phẩm hết hàng và chưa được đánh dấu is_returning
            if (!item.is_returning && (!stock || stock.quantity === 0)) {
                item.is_returning = true;
                await item.save();

                // 🔔 Gửi thông báo hết hàng
                const outOfStockNotification = await Notification.create({
                    user_id: req.user._id,
                    type: "out_of_stock",
                    title: "Sản phẩm trong giỏ đã hết hàng",
                    message: `Sản phẩm "${item.variant_id.product_id.name}" (${item.variant_id.color?.name ?? ''} / ${item.variant_id.size?.size ?? ''}) hiện đã hết hàng và được tạm thời gỡ khỏi giỏ hàng.`,
                });
                newNotifications.push(outOfStockNotification);
            }

            // ✅ Case 2: Sản phẩm đang is_returning và có hàng trở lại
            if (item.is_returning && stock && stock.quantity > 0 && user.auto_restore_cart) {
                // Chỉ khôi phục và thông báo khi user BẬT auto_restore_cart
                item.is_returning = false;
                await item.save();

                // 🔔 Gửi thông báo khôi phục tự động
                const restoreNotification = await Notification.create({
                    user_id: req.user._id,
                    type: "back_in_stock",
                    title: "Sản phẩm đã có hàng trở lại",
                    message: `Sản phẩm "${item.variant_id.product_id.name}" (${item.variant_id.color?.name ?? ''} / ${item.variant_id.size?.size ?? ''}) đã có hàng và được tự động thêm lại vào giỏ hàng của bạn.`,
                });
                newNotifications.push(restoreNotification);
            }

            // 🧮 Phân loại item và tính tổng
            if (item.is_returning) {
                returningItems.push(item);
            } else {
                activeItems.push(item);
                const price = item.variant_id.price || 0;
                const quantity = item.quantity || 0;
                total += price * quantity;
            }
        }

        return res.status(200).json({
            message: "Lấy giỏ hàng thành công",
            data: {
                cart_items: activeItems,
                returning_items: returningItems,
                total,
                auto_restore_enabled: user.auto_restore_cart,
                new_notifications: newNotifications // Trả về thông báo mới
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi lấy giỏ hàng",
            error: error.message
        });
    }
};


// thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
    try {
        const { variant_id, quantity} = req.body;
        const userId = req.user._id;

        let cart = await cart_MD.findOne({ user_id: userId });
        if (!cart) {
            cart = await cart_MD.create({ user_id: userId, cart_items: [] });
        }

        const variant = await variant_MD.findById(variant_id).populate('product_id', 'name');
        if (!variant) {
            return res.status(400).json({ message: "Không tìm thấy biến thể sản phẩm" });
        }

        if (variant.status === 'outOfStock') {
            return res.status(400).json({ message: "Sản phẩm đã hết hàng" });
        }

        const stock = await stock_MD.findOne({ product_variant_id: variant_id });
        if (!stock || stock.quantity < quantity) {
            return res.status(400).json({ message: "Không đủ hàng trong kho" });
        }

        let existingItem = await cartItem_MD.findOne({
            cart_id: cart._id,
            variant_id,
        });

        let addedItem;

        if (existingItem) {
            if (existingItem.quantity + quantity > stock.quantity) {
                return res.status(400).json({ message: "Số lượng vượt quá tồn kho" });
            }
            existingItem.quantity += quantity;
            await existingItem.save();
            addedItem = existingItem;
        } else {
            const newItem = await cartItem_MD.create({
                cart_id: cart._id,
                variant_id,
                quantity
            });
            cart.cart_items.push(newItem._id);
            await cart.save();
            addedItem = newItem;
        }

        return res.status(200).json({
            message: "Thêm vào giỏ hàng thành công",
            data: addedItem
        });

    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi thêm sản phẩm vào giỏ hàng",
            error: error.message
        });
    }
};


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

        // xóa ID sản phẩm khỏi danh sách cart_items của giỏ hàng
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
};

export const toggleAutoRestore = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.auto_restore_cart = !user.auto_restore_cart;
        await user.save();

        return res.status(200).json({
            message: `Đã ${user.auto_restore_cart ? 'bật' : 'tắt'} chức năng khôi phục giỏ hàng tự động.`,
            auto_restore_cart: user.auto_restore_cart
        });
    } catch (error) {
        return res.status(500).json({
            message: "Lỗi khi thay đổi chế độ khôi phục giỏ hàng",
            error: error.message
        });
    }
};
