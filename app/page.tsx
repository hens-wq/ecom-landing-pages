import { redirect } from "next/navigation";

// This project ships campaign landing pages only (no marketing homepage yet).
// Paid traffic always lands directly on a /lp/... URL; this route exists so
// "/" doesn't 404 while the site has a single page.
export default function RootPage() {
  redirect("/lp/brand/cyber");
}
