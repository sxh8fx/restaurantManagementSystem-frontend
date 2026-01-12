import api from "./api";

const createOrder = (items, reservationId) => { // items: [{menuItemId, quantity}]
    return api.post("/orders", { items, reservationId });
};

const getMyOrders = () => {
    return api.get("/orders/my");
};

const cancelOrder = (orderId) => {
    return api.put(`/orders/${orderId}/status?status=CANCELLED`);
};

const OrderService = {
    createOrder,
    getMyOrders,
    cancelOrder
};

export default OrderService;
