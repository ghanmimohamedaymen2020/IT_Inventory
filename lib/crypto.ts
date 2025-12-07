import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

const PYTHON_VENV = process.env.PYTHON_VENV_PATH || path.join(process.cwd(), 'venv')
const PYTHON_CMD = process.platform === 'win32' 
  ? path.join(PYTHON_VENV, 'Scripts', 'python.exe')
  : path.join(PYTHON_VENV, 'bin', 'python')

/**
 * Génère un QR code pour un code inventaire
 */
export async function generateQRCode(data: string, outputPath: string): Promise<boolean> {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'utils.py')
    const command = `"${PYTHON_CMD}" "${scriptPath}" qr "${data}" "${outputPath}"`
    
    await execAsync(command)
    return true
  } catch (error) {
    console.error('Erreur génération QR code:', error)
    return false
  }
}

/**
 * Chiffre des données sensibles (clés produit, licences)
 */
export async function encryptSensitiveData(data: string): Promise<string | null> {
  try {
    const secret = process.env.ENCRYPTION_KEY
    if (!secret) {
      throw new Error('ENCRYPTION_KEY non définie')
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'utils.py')
    const command = `"${PYTHON_CMD}" "${scriptPath}" encrypt "${data}" "${secret}"`
    
    const { stdout } = await execAsync(command)
    return stdout.trim()
  } catch (error) {
    console.error('Erreur chiffrement:', error)
    return null
  }
}

/**
 * Déchiffre des données sensibles
 */
export async function decryptSensitiveData(encryptedData: string): Promise<string | null> {
  try {
    const secret = process.env.ENCRYPTION_KEY
    if (!secret) {
      throw new Error('ENCRYPTION_KEY non définie')
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'utils.py')
    const command = `"${PYTHON_CMD}" "${scriptPath}" decrypt "${encryptedData}" "${secret}"`
    
    const { stdout } = await execAsync(command)
    return stdout.trim()
  } catch (error) {
    console.error('Erreur déchiffrement:', error)
    return null
  }
}
