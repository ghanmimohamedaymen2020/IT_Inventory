import { SignJWT } from 'jose'

const userId = 'cmix2gztt0001utom6m0w2zre'
const email = 'moghanmi@grm-e.com'
const companyId = 'cmiw5xa600000qrwttjjsmtm9'
const role = 'super_admin'

async function generateDevSession() {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
  
  const token = await new SignJWT({
    sub: userId,
    email: email,
    companyId: companyId,
    role: role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)

  console.log('=== NEW DEV-SESSION TOKEN ===')
  console.log(token)
  console.log('\n=== COOKIE TO SET ===')
  console.log(`dev-session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`)
  console.log('\nCopiez ce cookie dans votre navigateur (F12 > Storage > Cookies)')
}

generateDevSession()
