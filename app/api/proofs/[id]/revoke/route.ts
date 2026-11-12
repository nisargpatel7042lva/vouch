import { NextRequest, NextResponse } from 'next/server'
import { revokeProof } from '@/lib/proofs/index'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let token: string
  try {
    const body = (await req.json()) as { revokeToken?: unknown }
    token = typeof body.revokeToken === 'string' ? body.revokeToken : ''
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON with revokeToken' }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: 'revokeToken is required' }, { status: 400 })
  }

  const result = revokeProof(id, token)

  switch (result) {
    case 'ok':
      return NextResponse.json({ revoked: true, id })
    case 'not_found':
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    case 'wrong_token':
      return NextResponse.json({ error: 'Invalid revoke token' }, { status: 403 })
    case 'already_revoked':
      return NextResponse.json({ error: 'Proof already revoked' }, { status: 410 })
  }
}
