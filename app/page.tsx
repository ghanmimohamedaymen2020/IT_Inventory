import { redirect } from "next/navigation"

export default function Home() {
  // Redirection vers le dashboard ou login selon authentification
  redirect("/dashboard")
}
