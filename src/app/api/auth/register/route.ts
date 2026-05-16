import { NextRequest, NextResponse } from 'next/server';
import { registerUniversityUser } from '@/lib/university-auth';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    const result = await registerUniversityUser(
      typeof identifier === 'string' ? identifier : '',
      typeof password === 'string' ? password : '',
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Account created successfully.',
      role: result.role,
      name: result.name,
    });
  } catch (error) {
    console.error('[REGISTER_ERROR]', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
