import * as usersController from '../controllers/users.controller';
import * as profileController from '../controllers/profile.controller';
import * as avatarController from '../controllers/avatar.controller';
import * as changePasswordController from '../controllers/change-password.controller';

export const personalYUsuariosRoutes = {
  'admin/users': usersController,
  'user/profile': profileController,
  'user/avatar': avatarController,
  'user/change-password': changePasswordController,
};
