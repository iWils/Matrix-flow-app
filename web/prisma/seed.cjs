
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@local'; const adminUsername = 'admin'
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: adminEmail }, { username: adminUsername }] } })
  if (!exists) {
    await prisma.user.create({ data: { email: adminEmail, username: adminUsername, fullName: 'Admin', passwordHash: await bcrypt.hash('admin', 10), role: 'admin' } })
    console.log('Seeded admin@local / admin')
  } else {
    console.log('Admin already exists')
  }
}
main().then(()=>prisma.$disconnect())
