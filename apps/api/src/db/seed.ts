/**
 * Seed idempoten: kelas, akun dummy, dan riwayat kredit K1/K2 (Simulasi).
 *
 * Jalankan: npm run seed (dari root). Aman dijalankan berulang —
 * memakai ON CONFLICT DO UPDATE dan pemetaan nama → id.
 *
 * Akun mengikuti PRD: 3 kelas, 1 verifikator per kelas, mahasiswa per kelas,
 * 1 validator, 1 unit. Tidak ada password (login mock via cookie sesi).
 */

import { eq } from 'drizzle-orm';

import { createDb } from './client.js';
import { classes, users } from './schema.js';

interface SeedUser {
  name: string;
  nrp: string | null;
  role: 'student' | 'verifier' | 'validator' | 'unit';
  angkatan?: number;
  programStudi?: string;
  departemen?: string;
  jabatan?: string;
}

const SEED_CLASSES: { name: string; advisor: SeedUser; students: SeedUser[] }[] = [
  {
    name: 'D3-IT-A 2024',
    advisor: {
      name: 'Verifikator D3-IT-A',
      nrp: null,
      role: 'verifier',
      jabatan: 'Dosen Wali D3-IT-A',
      departemen: 'Teknologi Informasi',
    },
    students: [
      {
        name: 'Mahasiswa A1',
        nrp: '240810100001',
        role: 'student',
        angkatan: 2024,
        programStudi: 'D3 Teknologi Informasi',
        departemen: 'Teknologi Informasi',
      },
      {
        name: 'Mahasiswa A2',
        nrp: '240810100002',
        role: 'student',
        angkatan: 2024,
        programStudi: 'D3 Teknologi Informasi',
        departemen: 'Teknologi Informasi',
      },
      {
        name: 'Mahasiswa A3',
        nrp: '240810100003',
        role: 'student',
        angkatan: 2024,
        programStudi: 'D3 Teknologi Informasi',
        departemen: 'Teknologi Informasi',
      },
    ],
  },
  {
    name: 'D3-IT-B 2024',
    advisor: {
      name: 'Verifikator D3-IT-B',
      nrp: null,
      role: 'verifier',
      jabatan: 'Dosen Wali D3-IT-B',
      departemen: 'Teknologi Informasi',
    },
    students: [
      {
        name: 'Mahasiswa B1',
        nrp: '240810100011',
        role: 'student',
        angkatan: 2024,
        programStudi: 'D3 Teknologi Informasi',
        departemen: 'Teknologi Informasi',
      },
      {
        name: 'Mahasiswa B2',
        nrp: '240810100012',
        role: 'student',
        angkatan: 2024,
        programStudi: 'D3 Teknologi Informasi',
        departemen: 'Teknologi Informasi',
      },
      {
        name: 'Mahasiswa B3',
        nrp: '240810100013',
        role: 'student',
        angkatan: 2024,
        programStudi: 'D3 Teknologi Informasi',
        departemen: 'Teknologi Informasi',
      },
    ],
  },
  {
    name: 'Sarjana-Terap-C 2025',
    advisor: {
      name: 'Verifikator ST-C',
      nrp: null,
      role: 'verifier',
      jabatan: 'Dosen Wali Sarjana Terapan C',
      departemen: 'Teknologi Informasi',
    },
    students: [
      {
        name: 'Mahasiswa C1',
        nrp: '25810100101',
        role: 'student',
        angkatan: 2025,
        programStudi: 'Sarjana Terapan Informatika',
        departemen: 'Teknologi Informasi',
      },
      {
        name: 'Mahasiswa C2',
        nrp: '25810100102',
        role: 'student',
        angkatan: 2025,
        programStudi: 'Sarjana Terapan Informatika',
        departemen: 'Teknologi Informasi',
      },
      {
        name: 'Mahasiswa C3',
        nrp: '25810100103',
        role: 'student',
        angkatan: 2025,
        programStudi: 'Sarjana Terapan Informatika',
        departemen: 'Teknologi Informasi',
      },
    ],
  },
];

const VALIDATOR: SeedUser = {
  name: 'Validator Kemahasiswaan',
  nrp: null,
  role: 'validator',
  jabatan: 'Validator Unit Kemahasiswaan',
  departemen: 'Kemahasiswaan',
};

const UNIT: SeedUser = {
  name: 'Staff Unit Kemahasiswaan',
  nrp: null,
  role: 'unit',
  jabatan: 'Staff Unit Kemahasiswaan',
  departemen: 'Kemahasiswaan',
};

const { client, db } = createDb();

async function upsertUser(u: SeedUser, classId: number | null): Promise<number> {
  // nrp NULL (verifikator/validator/unit): idempoten via nama
  if (u.nrp === null) {
    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.name, u.name))
      .limit(1);
    if (found[0]) return found[0].id;
    const [inserted] = await db
      .insert(users)
      .values({
        name: u.name,
        nrp: null,
        role: u.role,
        angkatan: u.angkatan ?? null,
        programStudi: u.programStudi ?? null,
        departemen: u.departemen ?? null,
        jabatan: u.jabatan ?? null,
        classId,
      })
      .returning({ id: users.id });
    if (!inserted) throw new Error(`Gagal insert user: ${u.name}`);
    return inserted.id;
  }
  const [row] = await db
    .insert(users)
    .values({
      name: u.name,
      nrp: u.nrp,
      role: u.role,
      angkatan: u.angkatan ?? null,
      programStudi: u.programStudi ?? null,
      departemen: u.departemen ?? null,
      jabatan: u.jabatan ?? null,
      classId,
    })
    .onConflictDoUpdate({ target: users.nrp, set: { name: u.name } })
    .returning({ id: users.id });
  if (row) return row.id;
  throw new Error(`Gagal upsert user: ${u.nrp}`);
}

async function main(): Promise<void> {
  try {
    // validator + unit (tanpa kelas)
    await upsertUser(VALIDATOR, null);
    await upsertUser(UNIT, null);

    for (const c of SEED_CLASSES) {
      // 1. kelas tanpa advisor (hindari FK lingkar)
      const [cls] = await db
        .insert(classes)
        .values({ name: c.name })
        .onConflictDoUpdate({ target: classes.name, set: { name: c.name } })
        .returning({ id: classes.id });
      if (!cls) throw new Error(`Gagal upsert kelas: ${c.name}`);

      // 2. verifikator kelas
      const advisorId = await upsertUser(c.advisor, cls.id);
      await db.update(classes).set({ advisorId }).where(eq(classes.id, cls.id));

      // 3. mahasiswa
      for (const s of c.students) {
        await upsertUser(s, cls.id);
      }
    }

    const allClasses = await db.select({ id: classes.id, name: classes.name }).from(classes);
    const allUsers = await db
      .select({ id: users.id, name: users.name, role: users.role })
      .from(users);
    console.log(
      `Seed selesai: ${allClasses.length} kelas, ${allUsers.length} pengguna ` +
        `(${allUsers.filter((u) => u.role === 'student').length} mahasiswa, ` +
        `${allUsers.filter((u) => u.role === 'verifier').length} verifikator, ` +
        `${allUsers.filter((u) => u.role === 'validator').length} validator, ` +
        `${allUsers.filter((u) => u.role === 'unit').length} unit).`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});
