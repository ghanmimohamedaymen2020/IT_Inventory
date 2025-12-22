import FicheIntervention from "@/components/fiche-intervention"

export const metadata = {
  title: 'Interventions'
}

export default function Page() {
  return (
    <div className="p-3">
      <h1 className="text-xl font-semibold mb-3">Interventions</h1>
      <div className="max-w-3xl">
        <FicheIntervention />
      </div>
    </div>
  )
}
