import * as tuitionsController from '../controllers/tuitions.controller';
import * as accountStatementController from '../controllers/account-statement.controller';

export const pensionesYMorasRoutes = {
  'finances/tuitions': tuitionsController,
  'finances/account-statement': accountStatementController,
};

