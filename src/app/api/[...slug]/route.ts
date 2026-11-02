import { NextRequest, NextResponse } from 'next/server';
import { authRoutes } from '@/modules/auth/routes/auth.routes';
import { saasRoutes } from '@/modules/saas/routes/saas.routes';
import {
  datosYReglasRoutes,
  datosYReglasDynamicRoutes,
} from '@/modules/administracion/datos-y-reglas/routes/datos-y-reglas.routes';
import { personalYUsuariosRoutes } from '@/modules/administracion/personal-y-usuarios/routes/personal-y-usuarios.routes';
import { aulasYVacantesRoutes } from '@/modules/administracion/aulas-y-vacantes/routes/aulas-y-vacantes.routes';
import { familiasYApoderadosRoutes } from '@/modules/administracion/familias-y-apoderados/routes/familias-y-apoderados.routes';
import { padronDeAlumnosRoutes } from '@/modules/administracion/padron-de-alumnos/routes/padron-de-alumnos.routes';
import { admisionYMatriculasRoutes } from '@/modules/administracion/admision-y-matriculas/routes/admision-y-matriculas.routes';
import { flujoDeCajaRoutes } from '@/modules/financiero/flujo-de-caja/routes/flujo-de-caja.routes';
import { pensionesYMorasRoutes } from '@/modules/financiero/pensiones-y-moras/routes/pensiones-y-moras.routes';
import { productosYUniformesRoutes } from '@/modules/financiero/productos-y-uniformes/routes/productos-y-uniformes.routes';
import { serviciosYPrestamosRoutes } from '@/modules/financiero/servicios-y-prestamos/routes/servicios-y-prestamos.routes';
import { arqueoDeCajaDiariaRoutes } from '@/modules/financiero/arqueo-de-caja-diaria/routes/arqueo-de-caja-diaria.routes';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const MODULE_ROUTE_REGISTRY: Record<string, Record<string, any>> = {
  ...authRoutes,
  ...saasRoutes,
  ...datosYReglasRoutes,
  ...personalYUsuariosRoutes,
  ...aulasYVacantesRoutes,
  ...familiasYApoderadosRoutes,
  ...padronDeAlumnosRoutes,
  ...admisionYMatriculasRoutes,
  ...flujoDeCajaRoutes,
  ...pensionesYMorasRoutes,
  ...productosYUniformesRoutes,
  ...serviciosYPrestamosRoutes,
  ...arqueoDeCajaDiariaRoutes,
};

async function dispatch(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
  method: HttpMethod
) {
  const { slug } = await context.params;
  const routeKey = slug.join('/');

  // Caso especial de ruta dinámica: /api/admin/fee-concepts/:id
  if (slug.length === 3 && slug[0] === 'admin' && slug[1] === 'fee-concepts') {
    const handler = (datosYReglasDynamicRoutes.feeConceptById as Record<string, any>)[method];
    if (typeof handler === 'function') {
      return handler(req, { params: Promise.resolve({ id: slug[2] }) });
    }
    return NextResponse.json({ success: false, message: 'Método no permitido' }, { status: 405 });
  }

  const controller = MODULE_ROUTE_REGISTRY[routeKey];
  if (!controller) {
    return NextResponse.json(
      { success: false, message: `Ruta de módulo no encontrada: /api/${routeKey}` },
      { status: 404 }
    );
  }

  const handler = controller[method];
  if (typeof handler !== 'function') {
    return NextResponse.json(
      { success: false, message: `Método ${method} no soportado en /api/${routeKey}` },
      { status: 405 }
    );
  }

  return handler(req);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch(req, ctx, 'GET');
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch(req, ctx, 'POST');
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch(req, ctx, 'PUT');
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch(req, ctx, 'PATCH');
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return dispatch(req, ctx, 'DELETE');
}

