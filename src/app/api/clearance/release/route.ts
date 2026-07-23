import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// PATCH /api/clearance/release — public gate guard endpoint to mark APPROVED clearance as RELEASED
// No auth required since this runs on the gate-guard's public kiosk.
// Security: can only transition APPROVED -> RELEASED (already proctor-signed).
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Clearance request id is required.' }, { status: 400 });
    }

    // Fetch the clearance request
    const request = await prisma.gateClearanceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ error: 'Clearance request not found.' }, { status: 404 });
    }

    // Only APPROVED requests can be released by the gate guard
    if (request.status !== 'APPROVED') {
      return NextResponse.json({
        error: `Cannot release: clearance status is '${request.status}' (expected APPROVED).`,
      }, { status: 400 });
    }

    // Mark as RELEASED
    const updated = await prisma.gateClearanceRequest.update({
      where: { id },
      data: {
        status: 'RELEASED',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      id: updated.id,
      status: updated.status,
      releasedAt: updated.updatedAt,
    });
  } catch (error: any) {
    console.error('[GATE_RELEASE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
