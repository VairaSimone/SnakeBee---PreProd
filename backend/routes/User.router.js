import express from 'express';
import * as userController from '../controllers/UserRoute_controller.js';
import { authenticateJWT } from '../middlewares/Auth.js';
import { isAdmin, isOwnerOrAdmin } from '../middlewares/Authorization.js';
import User from '../models/User.js';
import upload from '../config/MulterConfig.js';

const userRouter = express.Router();
userRouter.get(
    '/',
    authenticateJWT, isAdmin,
    userController.GetAllUser
);
userRouter.get(
    '/:userId',
    authenticateJWT,
    isOwnerOrAdmin(User, 'userId'),
    userController.GetIDUser
);
userRouter.put("/:userId", authenticateJWT, isOwnerOrAdmin(User, "userId"), upload.single("avatar"), userController.PutUser);
userRouter.delete('/:userId', authenticateJWT,isOwnerOrAdmin(User, "userId"), userController.DeleteUser);

userRouter.patch('/users/email-settings/:userId', authenticateJWT, userController.updateEmailPreferences);

userRouter.patch(
  '/admin/users/:userId/role',
  authenticateJWT,
  isAdmin,
  userController.UpdateUserRole
);

export default userRouter;
