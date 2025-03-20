import express from 'express';
import { registerUser, loginUser, getAllUsers } from '../controllers/userController.js';  // Corrected to use ESM import

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', getAllUsers);

router.get('/', (_, res) => {
  res.send('User route works!');
});

export default router;


