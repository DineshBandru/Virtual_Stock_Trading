const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  placeOrderValidation,
  cancelOrderValidation,
  detailsValidation,
  listValidation,
  placeOrderHandler,
  cancelOrderHandler,
  listOrdersHandler,
  orderDetailsHandler
} = require("../controllers/ordersController");

const router = express.Router();

router.post("/", requireAuth, placeOrderValidation, placeOrderHandler);
router.post("/:id/cancel", requireAuth, cancelOrderValidation, cancelOrderHandler);
router.get("/", requireAuth, listValidation, listOrdersHandler);
router.get("/:id", requireAuth, detailsValidation, orderDetailsHandler);

module.exports = router;