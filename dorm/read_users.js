const { PrismaClient } = require('../node_modules/@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'file:../dev.db' } } });
p.user.findMany().then(u => {
  console.log(u.map(x => ({id: x.id, role: x.role, pwd: !!x.password})));
  p.$disconnect();
});
