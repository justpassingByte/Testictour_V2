import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const content = '56e49f8b-c138-453c-a5ab-f3767e4b7c58';
  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain' },
  });
} 