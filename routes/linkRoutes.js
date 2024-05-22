const express = require("express");
const router = express.Router();
const {
  addLinkSource,
  getAllLinkSources,
  deleteLinkSource,
  updateLinkSource,
} = require("../controllers/linkSourceController");

router
  .route("/link-sources")
  .get(getAllLinkSources)
  .post(addLinkSource)
  .delete(deleteLinkSource)
  .patch(updateLinkSource);

router.route("/link-types");
module.exports = router;
