import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-voice text-3xl font-semibold text-accent-text mb-2">ayna</div>
          <h1 className="font-voice text-2xl font-semibold text-text-primary">Ayna team sign in</h1>
          <p className="text-sm text-text-secondary mt-2 leading-6">
            This tracker is private. Sign in with the Google account that was invited to the Ayna workspace.
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn />
        </div>
        <p className="text-xs text-text-muted text-center mt-5 leading-5">
          Public sign-up is disabled. If you need access, ask an Ayna admin to invite you.
        </p>
      </div>
    </main>
  );
}
