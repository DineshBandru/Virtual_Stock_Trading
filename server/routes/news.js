const express = require("express");
const { getNews, getCompanyNews } = require("../controllers/newsController");

const router = express.Router();

router.get("/", getNews);
router.get("/:symbol", getCompanyNews);

module.exports = router;
