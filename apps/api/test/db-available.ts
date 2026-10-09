/**
 * Tes integrasi yang butuh DB seeded hanya jalan jika DATABASE_URL tersedia
 * (dimuat dari .env oleh env.setup.ts). Di CI tanpa DB, tes itu dilewati.
 */
export const HAS_DATABASE = Boolean(process.env.DATABASE_URL);
