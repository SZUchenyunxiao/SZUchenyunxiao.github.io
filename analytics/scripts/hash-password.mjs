import { createHash } from 'node:crypto'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'

const rl = createInterface({ input: stdin, output: stdout })
const password = await rl.question('New analytics password: ')
rl.close()

if (password.length < 16) {
  console.error('Use at least 16 characters; a password-manager-generated value is recommended.')
  process.exit(1)
}

const digest = createHash('sha256').update(password, 'utf8').digest('base64url')
const encoded = `sha256$${digest}`

console.log('\nCopy this value into `wrangler secret put ADMIN_PASSWORD_HASH`:')
console.log(encoded)
