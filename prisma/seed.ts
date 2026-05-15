import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (Room Assets & Multi-Block Staffing)...');

  // Clear existing data (in correct order of foreign keys)
  await prisma.attendanceLog.deleteMany();
  await prisma.gateClearanceRequest.deleteMany();
  await prisma.emergencyTicket.deleteMany();
  await prisma.shiftRegistry.deleteMany();
  await prisma.roomAsset.deleteMany();
  
  // To avoid relation constraints, first clear the keyCustodian on DormRoom
  await prisma.dormRoom.updateMany({ data: { keyCustodianId: null } });
  
  await prisma.user.deleteMany();
  await prisma.dormRoom.deleteMany();
  await prisma.dormBlock.deleteMany();

  // ─── Create Dorm Blocks ───
  const blockNames = ['Abay', 'Awash', 'Baro', 'Genale', 'Gibe', 'Mereb', 'Omo', 'Shebelle', 'Tekeze', 'Wabi'];
  const blocks = [];
  for (let i = 0; i < blockNames.length; i++) {
    const block = await prisma.dormBlock.create({
      data: {
        name: blockNames[i],
        number: i + 1,
        latitude: 9.68 + (i * 0.001),
        longitude: 39.53 + (i * 0.001),
        geofenceRadius: 100,
        capacity: 200,
      },
    });
    blocks.push(block);
  }
  console.log(`✅ Created ${blocks.length} dorm blocks`);

  // ─── Create Dorm Rooms per Block ───
  const rooms = [];
  for (const block of blocks) {
    for (let r = 1; r <= 3; r++) { // 3 rooms per block for demo
      const room = await prisma.dormRoom.create({
        data: {
          roomNumber: `${block.number}-${r}0${r}`, // e.g., 1-101
          dormBlockId: block.id,
        },
      });
      rooms.push(room);
      
      // Seed Room Assets for each room
      await prisma.roomAsset.createMany({
        data: [
          { roomId: room.id, type: 'CHAIR', quantity: 4, status: 'GOOD' },
          { roomId: room.id, type: 'LOCKER', quantity: 4, status: 'GOOD' },
          { roomId: room.id, type: 'TABLE', quantity: 2, status: 'GOOD' },
          { roomId: room.id, type: 'BED', quantity: 4, status: 'GOOD' },
          { roomId: room.id, type: 'KEY', quantity: 1, status: 'GOOD' },
        ],
      });
    }
  }
  console.log(`✅ Created ${rooms.length} dorm rooms with baseline assets`);

  // ─── Create Demo Users ───
  const hashedPassword = hashSync('password123', 10);

  // Admin
  const admin = await prisma.user.create({
    data: { name: 'Dr. Alemu Bekele', email: 'admin@dbu.edu.et', password: hashedPassword, role: 'ADMIN', phone: '+251911000001' },
  });

  // Staff (Multi-Block Assignment: 1 staff manages 3-4 blocks)
  const staffUsers = [];
  const staffNames = ['Ato Tadesse Worku', 'W/ro Meron Haile', 'Ato Girma Desta'];
  for (let i = 0; i < staffNames.length; i++) {
    // Assign 3 blocks to each staff member
    const assignedBlocks = blocks.slice(i * 3, i * 3 + 3).map(b => ({ id: b.id }));
    const primaryBlock = assignedBlocks[0]; // Office is in their first assigned block
    
    if (primaryBlock) {
      const staff = await prisma.user.create({
        data: {
          name: staffNames[i],
          email: `staff${i + 1}@dbu.edu.et`,
          password: hashedPassword,
          role: 'STAFF',
          dormBlockId: primaryBlock.id, // Primary office for geofence
          managedBlocks: { connect: assignedBlocks }, // Multi-block management
          phone: `+25191100000${i + 2}`,
        },
      });
      staffUsers.push(staff);
    }
  }
  console.log(`✅ Created ${staffUsers.length} staff, each managing multiple blocks`);

  // Students
  const students = [];
  const studentNames = [
    'Nahom Tesfaye', 'Hanna Mekonnen', 'Yonas Alemayehu', 'Sara Getachew', 
    'Abel Kebede', 'Marta Tadesse', 'Daniel Worku', 'Bethlehem Hailu'
  ];
  
  for (let i = 0; i < studentNames.length; i++) {
    const room = rooms[i % rooms.length];
    const student = await prisma.user.create({
      data: {
        name: studentNames[i],
        studentId: `DBU/${1000 + i}/15`,
        email: `student${i + 1}@dbu.edu.et`,
        password: hashedPassword,
        role: 'STUDENT',
        dormBlockId: room.dormBlockId,
        roomId: room.id,
      },
    });
    students.push(student);
    
    // Assign the first student in each room as Key Custodian
    if (i < rooms.length) {
      await prisma.dormRoom.update({
        where: { id: room.id },
        data: { keyCustodianId: student.id },
      });
    }
  }
  console.log(`✅ Created ${students.length} students and assigned Key Custodians`);

  // ─── Create Active Shifts ───
  for (const staff of staffUsers) {
    const primaryBlock = await prisma.dormBlock.findUnique({ where: { id: staff.dormBlockId! } });
    if (primaryBlock) {
      await prisma.shiftRegistry.create({
        data: {
          staffId: staff.id,
          primaryBlockId: primaryBlock.id,
          isActive: true,
          checkedInAt: new Date(),
          geofenceVerified: true,
          latitude: primaryBlock.latitude,
          longitude: primaryBlock.longitude,
        },
      });
    }
  }
  console.log('✅ Created active shifts for staff members');

  // ─── Sample Tickets ───
  await prisma.emergencyTicket.create({
    data: {
      studentId: students[0].id,
      dormBlockId: students[0].dormBlockId!,
      category: 'WATER',
      description: 'Burst pipe flooding room',
      status: 'OPEN',
      assignedStaffId: staffUsers[0].id,
    },
  });

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📧 Demo Login Credentials (password: password123):');
  console.log('   Student: student1@dbu.edu.et (Nahom Tesfaye)');
  console.log('   Staff:   staff1@dbu.edu.et (Ato Tadesse Worku - Multi-Block)');
  console.log('   Admin:   admin@dbu.edu.et');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
