import { DeliveryNoteFormV3 } from "@/components/delivery-notes/delivery-note-form-v3"

export default function CreateDeliveryNotePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Nouveau Bon de Livraison</h1>
        <DeliveryNoteFormV3 />
      </div>
    </div>
  )
}
