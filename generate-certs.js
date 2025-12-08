const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const certDir = path.join(__dirname, 'certificates')

// Créer le dossier certificates s'il n'existe pas
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir)
}

console.log('Génération des certificats SSL pour localhost...\n')

// Vérifier si mkcert est disponible
try {
  execSync('mkcert -version', { stdio: 'ignore' })
  console.log('✓ mkcert trouvé, génération des certificats...')
  
  // Installer l'autorité de certification
  execSync('mkcert -install', { stdio: 'inherit' })
  
  // Générer les certificats
  process.chdir(certDir)
  execSync('mkcert localhost 127.0.0.1 ::1', { stdio: 'inherit' })
  
  // Renommer les fichiers
  const files = fs.readdirSync('.')
  const certFile = files.find(f => f.match(/localhost\+\d+\.pem$/))
  const keyFile = files.find(f => f.match(/localhost\+\d+-key\.pem$/))
  
  if (certFile && keyFile) {
    fs.renameSync(certFile, 'localhost.pem')
    fs.renameSync(keyFile, 'localhost-key.pem')
  }
  
  process.chdir('..')
  console.log('\n✓ Certificats générés avec mkcert')
  console.log('Utilisez: npm run dev:https')
  
} catch (error) {
  // mkcert n'est pas disponible, essayer OpenSSL
  try {
    execSync('openssl version', { stdio: 'ignore' })
    console.log('✓ OpenSSL trouvé, génération des certificats...')
    
    const cmd = `openssl req -x509 -newkey rsa:4096 -keyout "${path.join(certDir, 'localhost-key.pem')}" -out "${path.join(certDir, 'localhost.pem')}" -days 365 -nodes -subj "/C=TN/ST=Tunis/L=Tunis/O=Development/CN=localhost"`
    
    execSync(cmd, { stdio: 'inherit' })
    
    console.log('\n✓ Certificats générés avec OpenSSL')
    console.log('⚠️  Votre navigateur affichera un avertissement de sécurité')
    console.log('Utilisez: npm run dev:https')
    
  } catch (opensslError) {
    // Ni mkcert ni OpenSSL disponibles, créer un certificat basique avec Node
    console.log('⚠️  Ni mkcert ni OpenSSL trouvés')
    console.log('Génération d\'un certificat auto-signé avec Node.js...\n')
    
    const forge = require('node-forge')
    const pki = forge.pki
    
    // Générer une paire de clés
    console.log('Génération de la paire de clés RSA...')
    const keys = pki.rsa.generateKeyPair(2048)
    
    // Créer un certificat
    console.log('Création du certificat...')
    const cert = pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date()
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
    
    const attrs = [{
      name: 'commonName',
      value: 'localhost'
    }, {
      name: 'countryName',
      value: 'TN'
    }, {
      shortName: 'ST',
      value: 'Tunis'
    }, {
      name: 'localityName',
      value: 'Tunis'
    }, {
      name: 'organizationName',
      value: 'Development'
    }]
    
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.setExtensions([{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'subjectAltName',
      altNames: [{
        type: 2, // DNS
        value: 'localhost'
      }, {
        type: 7, // IP
        ip: '127.0.0.1'
      }]
    }])
    
    // Signer le certificat
    cert.sign(keys.privateKey, forge.md.sha256.create())
    
    // Convertir en PEM
    const pemCert = pki.certificateToPem(cert)
    const pemKey = pki.privateKeyToPem(keys.privateKey)
    
    // Sauvegarder les fichiers
    fs.writeFileSync(path.join(certDir, 'localhost.pem'), pemCert)
    fs.writeFileSync(path.join(certDir, 'localhost-key.pem'), pemKey)
    
    console.log('\n✓ Certificat auto-signé généré avec succès')
    console.log('⚠️  Votre navigateur affichera un avertissement de sécurité')
    console.log('\nFichiers créés:')
    console.log('  - certificates/localhost.pem')
    console.log('  - certificates/localhost-key.pem')
    console.log('\nUtilisez: npm run dev:https')
  }
}
