import * as institutionController from '../controllers/institution.controller';
import * as feeConceptsController from '../controllers/fee-concepts.controller';
import * as feeConceptByIdController from '../controllers/fee-concept-by-id.controller';

export const datosYReglasRoutes = {
  'admin/institution': institutionController,
  'admin/fee-concepts': feeConceptsController,
};

export const datosYReglasDynamicRoutes = {
  feeConceptById: feeConceptByIdController,
};

