import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ schedules: [], message: 'No schedules yet' })
}

export async function POST(request) {
  const body = await request.json()
  return NextResponse.json({ schedule: body, message: 'Schedule created' }, { status: 201 })
}
