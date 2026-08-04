const express = require("express");
const router = express.Router();
const quickTestController = require("../controllers/quickTestController");
router.post("/rooms", quickTestController.createRoom);
router.get("/rooms/:roomCode", quickTestController.getRoom);
router.get("/my-room", quickTestController.getMyRoom);
router.post("/join", quickTestController.joinRoom);
router.get("/leaderboard", quickTestController.getLeaderboard);
router.put("/rooms/:roomCode/start", quickTestController.startRoom);
router.put("/rooms/:roomCode/end", quickTestController.endRoom);
router.post("/submit", quickTestController.submitAnswer);

module.exports = router;