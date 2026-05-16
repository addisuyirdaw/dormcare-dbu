import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, description, roomNumber, studentId } = body;

    // Basic 400 error validation
    if (!category || !description || !roomNumber || !studentId) {
      return NextResponse.json(
        { error: 'Missing required fields: category, description, roomNumber, and studentId are mandatory.' },
        { status: 400 }
      );
    }

    const validCategories = ['WATER', 'ELECTRICITY', 'SAFETY', 'FACILITY'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category type.' }, { status: 400 });
    }

    // Write to the IssueReport table with a default status of "OPEN"
    const issue = await prisma.issueReport.create({
      data: {
        category,
        description: description.trim(),
        roomNumber: roomNumber.trim(),
        studentId,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ message: 'Issue reported successfully', issue }, { status: 201 });
  } catch (error) {
    console.error('[ISSUES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
