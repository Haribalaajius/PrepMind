// src/app/page.tsx
// Middleware handles root redirect — this is a fallback.
import { redirect } from 'next/navigation'
export default function RootPage() { redirect('/dashboard') }
