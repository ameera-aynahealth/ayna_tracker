import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function NotAuthorizedPage() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6">
      <section className="w-full max-w-lg border border-border bg-surface p-8 shadow-sm" style={{ borderRadius: "28px 14px 14px 14px" }}>
        <div className="font-voice text-2xl font-semibold text-accent-text mb-6">ayna</div>
        <h1 className="font-voice text-3xl font-semibold mb-3">Ayna team access only</h1>
        <p className="text-sm text-text-secondary leading-6 mb-6">
          This tracker is only available to invited members of the Ayna Clerk organization. Signing in with any other Google or Clerk account does not grant access.
        </p>
        <p className="text-sm text-text-secondary leading-6 mb-6">
          If you are part of Ayna, ask an admin to invite the exact Google account you want to use, then sign in again.
        </p>
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <Link href="/sign-in" className="text-sm font-semibold text-accent-text">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
