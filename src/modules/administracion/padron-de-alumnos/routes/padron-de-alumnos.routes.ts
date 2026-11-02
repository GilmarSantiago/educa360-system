import * as studentsController from '../controllers/students.controller';
import * as studentLookupController from '../controllers/student-lookup.controller';

export const padronDeAlumnosRoutes = {
  'admin/students': studentsController,
  'admin/students/lookup': studentLookupController,
};

