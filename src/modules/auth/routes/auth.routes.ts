import * as loginController from '../controllers/login.controller';
import * as logoutController from '../controllers/logout.controller';
import * as meController from '../controllers/me.controller';

export const authRoutes = {
  'auth/login': loginController,
  'auth/logout': logoutController,
  'auth/me': meController,
};
