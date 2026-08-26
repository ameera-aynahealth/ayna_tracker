import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Cron is protected by CRON_SECRET inside the route itself. It must remain
// public to Clerk or Vercel's scheduler cannot reach it.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/not-authorized(.*)",
  "/api/cron(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
