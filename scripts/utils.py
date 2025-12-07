"""
Script Python pour générer des QR codes et gérer le chiffrement
Utilisé par l'application Next.js via des appels système
"""

import qrcode
import os
import sys
from cryptography.fernet import Fernet
import base64
import hashlib

def generate_qr_code(data: str, output_path: str) -> bool:
    """
    Génère un QR code à partir des données fournies
    Args:
        data: Les données à encoder (ex: IT-ASSET-ABC-001)
        output_path: Chemin du fichier de sortie
    Returns:
        True si succès, False sinon
    """
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(output_path)
        return True
    except Exception as e:
        print(f"Erreur génération QR code: {e}", file=sys.stderr)
        return False

def get_fernet_key(secret: str) -> bytes:
    """
    Génère une clé Fernet valide à partir d'un secret
    """
    # Utilise le hash SHA256 du secret, puis encode en base64 pour Fernet
    hash_key = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(hash_key)

def encrypt_data(data: str, secret: str) -> str:
    """
    Chiffre des données sensibles (clés produit Windows, licences)
    Args:
        data: Données à chiffrer
        secret: Clé de chiffrement (depuis ENCRYPTION_KEY)
    Returns:
        Données chiffrées en base64
    """
    try:
        fernet = Fernet(get_fernet_key(secret))
        encrypted = fernet.encrypt(data.encode())
        return encrypted.decode()
    except Exception as e:
        print(f"Erreur chiffrement: {e}", file=sys.stderr)
        return ""

def decrypt_data(encrypted_data: str, secret: str) -> str:
    """
    Déchiffre des données sensibles
    Args:
        encrypted_data: Données chiffrées en base64
        secret: Clé de chiffrement (depuis ENCRYPTION_KEY)
    Returns:
        Données déchiffrées
    """
    try:
        fernet = Fernet(get_fernet_key(secret))
        decrypted = fernet.decrypt(encrypted_data.encode())
        return decrypted.decode()
    except Exception as e:
        print(f"Erreur déchiffrement: {e}", file=sys.stderr)
        return ""

if __name__ == "__main__":
    # CLI pour utilisation directe
    if len(sys.argv) < 2:
        print("Usage: python utils.py [qr|encrypt|decrypt] <args>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "qr" and len(sys.argv) == 4:
        data = sys.argv[2]
        output = sys.argv[3]
        success = generate_qr_code(data, output)
        sys.exit(0 if success else 1)
    
    elif command == "encrypt" and len(sys.argv) == 4:
        data = sys.argv[2]
        secret = sys.argv[3]
        result = encrypt_data(data, secret)
        print(result)
        sys.exit(0 if result else 1)
    
    elif command == "decrypt" and len(sys.argv) == 4:
        encrypted = sys.argv[2]
        secret = sys.argv[3]
        result = decrypt_data(encrypted, secret)
        print(result)
        sys.exit(0 if result else 1)
    
    else:
        print("Arguments invalides")
        sys.exit(1)
