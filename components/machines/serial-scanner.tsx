"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Search, X } from "lucide-react"
import { toast } from "sonner"

interface SerialScannerProps {
  onSerialDetected: (serial: string) => void
}

export function SerialScanner({ onSerialDetected }: SerialScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [manualSerial, setManualSerial] = useState("")
  const [lastScanned, setLastScanned] = useState<string[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsScanning(true)
        toast.success("Caméra activée")
      }
    } catch (error) {
      toast.error("Impossible d'accéder à la caméra")
      console.error(error)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const captureSerial = () => {
    // Simulation de capture - dans un vrai projet, utilisez une bibliothèque OCR
    const simulatedSerial = `SN${Date.now().toString().slice(-8)}`
    setLastScanned([simulatedSerial, ...lastScanned.slice(0, 4)])
    onSerialDetected(simulatedSerial)
    toast.success(`Numéro de série détecté: ${simulatedSerial}`)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualSerial.trim()) {
      setLastScanned([manualSerial, ...lastScanned.slice(0, 4)])
      onSerialDetected(manualSerial)
      toast.success("Numéro de série saisi")
      setManualSerial("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scanner de numéro de série</CardTitle>
        <CardDescription>
          Utilisez la caméra pour scanner ou saisissez manuellement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Caméra */}
        <div className="space-y-2">
          {isScanning && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-green-500 rounded-lg"></div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startCamera} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Activer la caméra
              </Button>
            ) : (
              <>
                <Button onClick={captureSerial} className="flex-1">
                  Capturer
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Saisie manuelle */}
        <div className="space-y-2">
          <Label htmlFor="manual-serial">Saisie manuelle</Label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              id="manual-serial"
              value={manualSerial}
              onChange={(e) => setManualSerial(e.target.value)}
              placeholder="Ex: ABC123456789"
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Historique */}
        {lastScanned.length > 0 && (
          <div className="space-y-2">
            <Label>Derniers scans</Label>
            <div className="space-y-1">
              {lastScanned.map((serial, idx) => (
                <button
                  key={idx}
                  onClick={() => onSerialDetected(serial)}
                  className="w-full text-left px-3 py-2 text-sm bg-secondary rounded-md hover:bg-secondary/80 transition-colors"
                >
                  {serial}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
