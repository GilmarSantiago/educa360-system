import * as loansController from '../controllers/loans.controller';
import * as recurringController from '../controllers/recurring.controller';

export const serviciosYPrestamosRoutes = {
  'finances/loans': loansController,
  'finances/recurring': recurringController,
};

