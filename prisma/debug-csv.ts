import fs from 'fs'
import path from 'path'
const p = path.join(__dirname, '../usersupload.csv')
const buf = fs.readFileSync(p)
console.log('bytes:', buf.length)
const s = buf.toString('utf8')
console.log('first 400 chars:')
console.log(s.slice(0,400))
let lf = 0, cr = 0, crlf = 0
for (let i=0;i<buf.length;i++){
  if (buf[i] === 10) lf++
  if (buf[i] === 13) cr++
}
// count CRLF occurrences
for (let i=0;i<buf.length-1;i++) if (buf[i]===13 && buf[i+1]===10) crlf++
console.log('LF:', lf, 'CR:', cr, 'CRLF:', crlf)
