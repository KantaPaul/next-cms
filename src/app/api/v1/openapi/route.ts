import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '@/server/api/openapi';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(buildOpenApiSpec());
}
