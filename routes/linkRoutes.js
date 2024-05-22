const express = require("express");
const { protect, allowTo } = require("../controllers/authController");

const router = express.Router();

const {
  addLinkSource,
  getAllLinkSources,
  deleteLinkSource,
  updateLinkSource,
} = require("../controllers/linkSourceController");

router
  .route("/link-sources")
  .get(protect, getAllLinkSources)
  .post(protect, addLinkSource)
  .delete(protect, allowTo("ADMIN"), deleteLinkSource)
  .patch(protect, updateLinkSource);

router.route("/link-types");
module.exports = router;
