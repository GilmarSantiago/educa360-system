import * as transactionsController from '../controllers/transactions.controller';
import * as categoriesController from '../controllers/categories.controller';
import * as paymentMethodsController from '../controllers/payment-methods.controller';
import * as forecastController from '../controllers/forecast.controller';
import * as monthlyReportController from '../controllers/monthly-report.controller';
import * as exportController from '../controllers/export.controller';

export const flujoDeCajaRoutes = {
  'finances/transactions': transactionsController,
  'finances/categories': categoriesController,
  'finances/payment-methods': paymentMethodsController,
  'finances/forecast': forecastController,
  'finances/monthly-report': monthlyReportController,
  'finances/export': exportController,
};
