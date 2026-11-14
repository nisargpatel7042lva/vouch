import { NextRequest, NextResponse } from 'next/server'
import { getProof, bindWallet } from '@/lib/proofs/index'
import { ethers } from 'ethers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let walletAddress: string
  let walletSignature: string
  try {
    const body = await req.json() as { walletAddress?: string; walletSignature?: string }
    walletAddress = (body.walletAddress ?? '').trim()
    walletSignature = (body.walletSignature ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!walletAddress || !walletSignature) {
    return NextResponse.json({ error: 'walletAddress and walletSignature are required' }, { status: 400 })
  }

  // Verify the EIP-191 personal_sign signature server-side
  const message = `Vouch proof: ${id}\nI am the owner of this proof.`
  let recovered: string
  try {
    recovered = ethers.verifyMessage(message, walletSignature)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
    return NextResponse.json(
      { error: 'Signature does not match wallet address' },
      { status: 400 }
    )
  }

  const proof = await getProof(id)
  if (!proof) return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  if (proof.revokedAt) return NextResponse.json({ error: 'Proof has been revoked' }, { status: 410 })

  const result = await bindWallet(id, walletAddress.toLowerCase(), walletSignature)

  if (result === 'not_found') return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
  if (result === 'already_bound') return NextResponse.json({ error: 'Wallet already bound to this proof' }, { status: 409 })

  return NextResponse.json({ ok: true, walletAddress: walletAddress.toLowerCase() })
}
