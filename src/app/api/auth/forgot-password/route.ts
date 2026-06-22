import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const schema = z.object({ email: z.string().email() })

const ONE_HOUR_MS = 60 * 60 * 1000

const SUCCESS_RESPONSE = { message: 'If that email is registered, you will receive a reset link.' }

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(SUCCESS_RESPONSE)
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    if (!user) {
      return NextResponse.json(SUCCESS_RESPONSE)
    }

    // Invalidate any existing unused tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + ONE_HOUR_MS),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your Steward VBS password',
      text: `Click this link to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Click this link to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`,
    })

    return NextResponse.json(SUCCESS_RESPONSE)
  } catch {
    return NextResponse.json(SUCCESS_RESPONSE)
  }
}
