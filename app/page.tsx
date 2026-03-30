import { redirect } from "next/navigation";

export const dynamic = "force-dynamic"; // Forza Next.js a non usare la memoria vecchia

export default function Home() {
  redirect("/login");
}