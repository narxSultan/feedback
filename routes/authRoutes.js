import { register, login, getUsers, deleteUser, loginUser } from "../controllers/authController.js";
import express from "express";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ message: 'Login route works!' });
});


// Define routes
router.post("/register", register);
router.post("/login", login);
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
//router.get("/", loginUser);
router.get("/users", verifyToken, isAdmin, getUsers);
router.delete("/users/:id", verifyToken, isAdmin, deleteUser);

export default router;