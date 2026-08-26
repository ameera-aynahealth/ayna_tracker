import { SignOutButton } from "@clerk/nextjs";

export default async function NotAuthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const inactive = reason === "inactive";

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6">
      <section className="w-full max-w-lg border border-border bg-surface p-8 shadow-sm" style={{ borderRadius: "28px 14px 14px 14px" }}>
        <div className="font-voice text-2xl font-semibold text-accent-text mb-6">ayna</div>
        <h1 className="font-voice text-3xl font-semibold mb-3">
          {inactive ? "Your tracker access is inactive" : "Only @aynahealth.co has access"}
        </h1>
        {inactive ? (
          <>
            <p className="text-sm text-text-secondary leading-6 mb-6">
              Your Ayna email is recognized, but this internal tracker profile is currently marked inactive.
            </p>
            <p className="text-sm text-text-secondary leading-6 mb-6">
              Ask an Ayna tracker admin to reactivate your profile under Settings → Team access.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-text-secondary leading-6 mb-6">
              This signed-in Clerk account does not currently contain an @aynahealth.co email address.
            </p>
            <p className="text-sm text-text-secondary leading-6 mb-6">
              Sign out completely, then sign back in with your Ayna Google Workspace account. If Clerk has both a personal and Ayna email attached, the tracker will use the Ayna address automatically.
            </p>
          </>
        )}
        <SignOutButton redirectUrl="/sign-in">
          <button className="bg-accent text-white rounded-xl px-4 py-2.5 text-sm font-semibold">
            Sign out and return to sign in
          </button>
        </SignOutButton>
      </section>
    </main>
  );
}
