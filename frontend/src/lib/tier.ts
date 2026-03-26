const ADMIN_EMAILS = [
  'dhayer2000@gmail.com',
]

export function getUserTier(user: { primaryEmailAddress?: { emailAddress?: string } | null, publicMetadata?: Record<string, unknown> } | null | undefined): 'free' | 'pro' {
  if (!user) return 'free'
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase()
  if (email && ADMIN_EMAILS.includes(email)) return 'pro'
  return ((user.publicMetadata as any)?.tier as 'pro' | 'free') || 'free'
}
