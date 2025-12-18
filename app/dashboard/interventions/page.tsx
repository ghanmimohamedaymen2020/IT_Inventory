import FicheIntervention from "@/components/fiche-intervention"

export const metadata = {
  title: 'Interventions'
}

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Interventions</h1>
      <div className="max-w-4xl">
        <FicheIntervention />
      </div>
    </div>
  )
}
