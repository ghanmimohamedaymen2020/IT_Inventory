import ConsumableList from '@/components/consumables/consumable-list'

export default function ConsumablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consommables</h1>
        <p className="text-muted-foreground mt-1">Gérer les consommables par société</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <ConsumableList />
      </div>
    </div>
  )
}
