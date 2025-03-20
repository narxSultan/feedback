import { register, login, getUsers, deleteUser, loginUser } from "../controllers/authController.js";
import express from "express";

const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ message: 'Login route works!' });
});


// Define routes
router.post("/register", register);
router.post("/login", login);
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
router.get("/", loginUser);

export default router;