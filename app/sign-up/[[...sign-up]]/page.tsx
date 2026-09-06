import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-voice text-3xl font-semibold text-accent-text mb-2">ayna</div>
          <h1 className="font-voice text-2xl font-semibold text-text-primary">Create your Ayna tracker login</h1>
          <p className="text-sm text-text-secondary mt-2 leading-6">
            Use your @aynahealth.co account. The tracker checks the email domain again on the server before allowing access.
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp signInUrl="/sign-in" />
        </div>
        <p className="text-xs text-text-muted text-center mt-5 leading-5">
          This creates only your sign-in identity. No Clerk organization invitation is required.
        </p>
      </div>
    </main>
  );
}
