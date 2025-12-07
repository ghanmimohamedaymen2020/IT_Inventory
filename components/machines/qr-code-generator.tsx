"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Download, Printer } from "lucide-react"
import { toast } from "sonner"

interface QRCodeGeneratorProps {
  machineId: string
  inventoryCode: string
  serialNumber?: string
}

export function QRCodeGenerator({ machineId, inventoryCode, serialNumber }: QRCodeGeneratorProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateQRCode = async () => {
    setIsGenerating(true)
    try {
      // Créer les données à encoder
      const qrData = JSON.stringify({
        id: machineId,
        code: inventoryCode,
        serial: serialNumber,
        timestamp: new Date().toISOString()
      })

      // Appeler l'API Python pour générer le QR code
      const response = await fetch("/api/qrcode/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: qrData })
      })

      if (!response.ok) throw new Error("Erreur génération QR code")

      const { qrCodeBase64 } = await response.json()
      setQrCode(qrCodeBase64)
      toast.success("QR code généré avec succès")
    } catch (error) {
      toast.error("Erreur lors de la génération du QR code")
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCode) return

    const link = document.createElement("a")
    link.href = `data:image/png;base64,${qrCode}`
    link.download = `qrcode-${inventoryCode}.png`
    link.click()
    toast.success("QR code téléchargé")
  }

  const printQRCode = () => {
    if (!qrCode) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${inventoryCode}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0;
              font-family: Arial, sans-serif;
            }
            img { max-width: 300px; margin: 20px; }
            .info { text-align: center; margin: 10px; }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>${inventoryCode}</h2>
            ${serialNumber ? `<p>S/N: ${serialNumber}</p>` : ""}
          </div>
          <img src="data:image/png;base64,${qrCode}" alt="QR Code" />
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 100);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code</CardTitle>
        <CardDescription>
          Générer un QR code pour cette machine
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrCode ? (
          <Button 
            onClick={generateQRCode} 
            disabled={isGenerating}
            className="w-full"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {isGenerating ? "Génération..." : "Générer QR Code"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img 
                src={`data:image/png;base64,${qrCode}`} 
                alt="QR Code"
                className="w-64 h-64"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={downloadQRCode} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
              <Button onClick={printQRCode} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            </div>

            <Button 
              onClick={() => setQrCode(null)} 
              variant="ghost"
              className="w-full"
            >
              Régénérer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
