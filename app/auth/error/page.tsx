import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const error = searchParams.error

  let errorMessage = "Une erreur s'est produite lors de l'authentification."
  
  if (error === "AccessDenied") {
    errorMessage = "Accès refusé. Votre compte n'est pas autorisé à accéder à cette application."
  } else if (error === "Configuration") {
    errorMessage = "Erreur de configuration du serveur."
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-destructive">
            Erreur d'authentification
          </CardTitle>
          <CardDescription className="text-base">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre administrateur système.
          </p>
          <Link href="/auth/login" className="block">
            <Button className="w-full">
              Retour à la connexion
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
