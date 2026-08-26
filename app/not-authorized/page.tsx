import { SignOutButton } from "@clerk/nextjs";

export default function NotAuthorizedPage() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6">
      <section className="w-full max-w-lg border border-border bg-surface p-8 shadow-sm" style={{ borderRadius: "28px 14px 14px 14px" }}>
        <div className="font-voice text-2xl font-semibold text-accent-text mb-6">ayna</div>
        <h1 className="font-voice text-3xl font-semibold mb-3">Only @aynahealth.co has access</h1>
        <p className="text-sm text-text-secondary leading-6 mb-6">
          Sign in with your Ayna email address to use the tracker.
        </p>
        <p className="text-sm text-text-secondary leading-6 mb-6">
          Personal Gmail, Outlook, and any other non-Ayna email accounts cannot access the tracker.
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
            Sign out and return to sign in
          </button>
        </SignOutButton>
      </section>
    </main>
  );
}
