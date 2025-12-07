import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json()

    if (!data) {
      return NextResponse.json({ error: "Données requises" }, { status: 400 })
    }

    // Chemin vers le script Python
    const scriptPath = path.join(process.cwd(), "scripts", "utils.py")
    const outputPath = path.join(process.cwd(), "temp", `qr_${Date.now()}.png`)

    // Créer le dossier temp s'il n'existe pas
    const tempDir = path.join(process.cwd(), "temp")
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Déterminer la commande Python (venv ou global)
    const isWindows = process.platform === "win32"
    const pythonCmd = isWindows
      ? path.join(process.cwd(), "venv", "Scripts", "python.exe")
      : path.join(process.cwd(), "venv", "bin", "python")

    // Vérifier si Python venv existe, sinon utiliser python global
    const pythonExecutable = fs.existsSync(pythonCmd) ? pythonCmd : "python"

    // Échapper les données pour la ligne de commande
    const escapedData = data.replace(/"/g, '\\"')

    // Exécuter le script Python
    const command = `"${pythonExecutable}" "${scriptPath}" generate-qr "${escapedData}" "${outputPath}"`
    
    await execAsync(command)

    // Lire le fichier QR code généré
    const qrCodeBuffer = fs.readFileSync(outputPath)
    const qrCodeBase64 = qrCodeBuffer.toString("base64")

    // Supprimer le fichier temporaire
    fs.unlinkSync(outputPath)

    return NextResponse.json({ qrCodeBase64 })
  } catch (error) {
    console.error("Erreur génération QR code:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération du QR code" },
      { status: 500 }
    )
  }
}
