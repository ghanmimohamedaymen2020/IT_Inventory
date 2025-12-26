import FicheIntervention from "@/components/fiche-intervention"
import axios from 'axios';

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

// scripts/create-consumable.js
async function createConsumable() {
  const res = await axios.post('http://localhost:3000/api/consumables', {
    typeName: 'Souris filaire',
    typeCode: 'MOUSE-WIRED',
    companyId: 'COMPANY_ID_HERE',
    initialQuantity: 5
  }, {
    headers: { Cookie: 'dev-session=YOUR_DEV_SESSION_COOKIE' } // use dev-session cookie for auth
  });
  console.log(res.data);
}

createConsumable().catch(e => console.error(e.response ? e.response.data : e.message));
