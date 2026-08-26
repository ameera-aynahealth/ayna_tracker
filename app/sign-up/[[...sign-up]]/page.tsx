import { redirect } from "next/navigation";

export default function Page() {
  // Ayna Tracker does not allow public self-sign-up. New teammates must be
  // invited to the Ayna Clerk organization by an admin first.
  redirect("/sign-in");
}
