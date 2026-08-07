const { param, query, body } = require("express-validator");
const { runValidation } = require("../middleware/validate");
const {
  ORDER_TYPES,
  ORDER_SIDES,
  placeOrder,
  cancelOrder,
  getOrders,
  getOrderById
} = require("../services/orderService");

const placeOrderHandler = async (req, res, next) => {
  try {
    const {
      symbol,
      quantity,
      side,
      orderType,
      triggerPrice,
      limitPrice
    } = req.body;

    const execution = await placeOrder({
      userId: req.user.id,
      symbol,
      quantity: Number(quantity),
      side,
      orderType,
      triggerPrice: triggerPrice !== undefined && triggerPrice !== null ? Number(triggerPrice) : undefined,
      limitPrice: limitPrice !== undefined && limitPrice !== null ? Number(limitPrice) : undefined
    });

    return res.status(201).json(execution);
  } catch (err) {
    return next(err);
  }
};

const cancelOrderHandler = async (req, res, next) => {
  try {
    const order = await cancelOrder(req.user.id, req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.json({ order });
  } catch (err) {
    if (err.message === "Only pending or triggered orders can be cancelled") {
      return res.status(400).json({ message: err.message });
    }
    return next(err);
  }
};

const listOrdersHandler = async (req, res, next) => {
  try {
    const orders = await getOrders(req.user.id, req.query);
    return res.json(orders);
  } catch (err) {
    return next(err);
  }
};

const orderDetailsHandler = async (req, res, next) => {
  try {
    const order = await getOrderById(req.user.id, req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    return res.json(order);
  } catch (err) {
    return next(err);
  }
};

const placeOrderValidation = [
  body("symbol").isString().trim().notEmpty(),
  body("quantity").isInt({ gt: 0 }),
  body("side").isIn(ORDER_SIDES),
  body("orderType").isIn(ORDER_TYPES),
  body("triggerPrice").custom((value, { req }) => {
    if (["STOP_LOSS", "STOP_LIMIT"].includes(req.body.orderType)) {
      if (value === undefined || value === null || value === "") {
        throw new Error("Trigger price is required for stop orders");
      }
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
        throw new Error("Trigger price must be greater than 0");
      }
    }
    return true;
  }),
  body("limitPrice").custom((value, { req }) => {
    if (["LIMIT", "STOP_LIMIT"].includes(req.body.orderType)) {
      if (value === undefined || value === null || value === "") {
        throw new Error("Limit price is required for limit orders");
      }
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
        throw new Error("Limit price must be greater than 0");
      }
    }
    return true;
  })
];

const orderIdValidation = [param("id").isMongoId()];

module.exports = {
  placeOrderValidation: [...placeOrderValidation, runValidation],
  cancelOrderValidation: [...orderIdValidation, runValidation],
  detailsValidation: [...orderIdValidation, runValidation],
  listValidation: [
    query("status").optional().isIn(["Pending", "Triggered", "Executed", "Cancelled", "Rejected"]),
    query("symbol").optional().isString().trim().notEmpty(),
    query("orderType").optional().isIn(ORDER_TYPES),
    runValidation
  ],
  placeOrderHandler,
  cancelOrderHandler,
  listOrdersHandler,
  orderDetailsHandler
};
