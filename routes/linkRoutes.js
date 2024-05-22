const express = require("express");
const { protect } = require("../controllers/authController");

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
  .post(addLinkSource)
  .delete(deleteLinkSource)
  .patch(updateLinkSource);

router.route("/link-types");
module.exports = router;
