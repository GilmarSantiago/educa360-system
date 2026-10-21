import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('educa360_session')?.value;

    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    // Obtener datos frescos del usuario y su colegio
    const userRes = await query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.avatar, u.phone, u.is_active, u.tenant_id,
              t.code as tenant_code, t.name as tenant_name, t.plan as tenant_plan, t.status as tenant_status,
              c.grading_system, c.passing_grade, c.period_type, c.monthly_due_day, c.late_fee_daily_percentage,
              c.grace_days, c.allow_multiple_cash_sessions, c.require_token_for_differences, c.enabled_modules
       FROM v2.users u
       LEFT JOIN v2.tenants t ON u.tenant_id = t.id
       LEFT JOIN v2.school_configs c ON t.id = c.tenant_id
       WHERE u.id = $1
       LIMIT 1`,
      [session.userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const row = userRes.rows[0];

    const user = {
      id: row.id,
      username: row.username,
      name: row.name,
      email: row.email,
      role: row.role,
      avatar: row.avatar,
      phone: row.phone,
      tenant: row.tenant_id
        ? {
            id: row.tenant_id,
            code: row.tenant_code,
            name: row.tenant_name,
            plan: row.tenant_plan,
            status: row.tenant_status,
            config: {
              gradingSystem: row.grading_system,
              passingGrade: Number(row.passing_grade),
              periodType: row.period_type,
              monthlyDueDay: row.monthly_due_day,
              lateFeeDailyPercentage: Number(row.late_fee_daily_percentage),
              graceDays: row.grace_days,
              allowMultipleCashSessions: row.allow_multiple_cash_sessions,
              requireTokenForDifferences: row.require_token_for_differences,
              enabledModules: row.enabled_modules || [],
            },
          }
        : null,
    };

    return NextResponse.json({ success: true, user });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al verificar sesión';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
