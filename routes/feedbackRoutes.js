import express from "express";
import {
  getFeedback,
  addFeedback,
  replyFeedback,
  deleteFeedback,
} from "../controllers/feedbackController.js";

const router = express.Router();

router.get("/", getFeedback);
router.post("/", addFeedback);
router.put("/:id/reply", replyFeedback);
router.delete("/:id", deleteFeedback);

export default router;