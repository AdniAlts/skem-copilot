import { apiClient } from './client';
import { calculateEstimatedCredit } from '../lib/credit-calc';
import type { SubmissionDetail, PatchSubmissionBody } from '@skem/shared';

// In-memory demo store for realistic frontend behavior when API returns 404 or in mock mode
const mockStore: Record<string, SubmissionDetail> = {};

function createDefaultMockSubmission(publicId: string): SubmissionDetail {
  return {
    publicId,
    status: 'draft',
    reviewStatus: 'ready',
    officialStatus: 'dalam_proses',
    student: {
      name: 'Budi Santoso',
      nrp: '3122500001',
      programStudi: 'D3 Teknik Informatika',
      departemen: 'Teknik Informatika dan Komputer',
      angkatan: 2025,
      className: '2 D3 IT B',
    },
    verifier: {
      name: 'Dr. Akhmad Alimudin',
      jabatan: 'Dosen Wali Kelas 2 D3 IT B',
    },
    activity: {
      activityName: 'Lomba Desain Poster Nasional 2026',
      activityDate: '2026-05-15',
      locationPlatform: 'Surabaya / Daring',
      organizer: 'BEM Politeknik Elektronika Negeri Surabaya',
      attachmentType: 'Sertifikat',
    },
    skem: {
      komponen: 3,
      categoryCode: 'K3-B01',
      level: 'Nasional',
      roleInActivity: 'Juara II',
      achievement: 'Juara II Kategori Desain Poster',
      creditEntryId: 'K3-B01-NAS-JUARA2',
      estimatedCredit: 1.1,
      finalCredit: null,
    },
    deadline: {
      result: 'pass',
      validFrom: '2025-10-10',
      validTo: '2026-10-10',
      message: 'Kegiatan dilaksanakan dalam masa berlaku SKEM mahasiswa angkatan 2025.',
    },
    findings: [
      {
        checkType: 'category',
        result: 'pass',
        confidence: 0.95,
        message: 'Kategori kegiatan sesuai dengan Komponen 3 (Prestasi dan Lomba Penalaran/Kreativitas).',
        guidelineRef: {
          id: 'ketentuan-umum-bobot',
          title: 'Kategori Komponen 3',
          ref: 'Pedoman SKEM, Lampiran Daftar Kegiatan SKEM PENS, hlm. 27',
        },
      },
      {
        checkType: 'level',
        result: 'pass',
        confidence: 0.92,
        message: 'Tingkat kegiatan adalah Nasional (peserta mencakup lebih dari 3 provinsi).',
        guidelineRef: {
          id: 'istilah-tingkat-kegiatan',
          title: 'Tingkat Kegiatan',
          ref: 'Pedoman SKEM, B. Ketentuan Umum, Istilah dan Definisi poin 12, hlm. 10',
        },
      },
      {
        checkType: 'name_match',
        result: 'pass',
        confidence: 0.98,
        message: 'Nama pada sertifikat cocok dengan nama mahasiswa di akun SIM (Budi Santoso).',
      },
      {
        checkType: 'deadline',
        result: 'pass',
        confidence: 0.9,
        message: 'Tanggal kegiatan masih dalam rentang valid 1 tahun sebelum pengajuan.',
      },
      {
        checkType: 'credit',
        result: 'pass',
        confidence: 1.0,
        message: 'Bobot kredit terhitung 1,10 poin berdasarkan tabel Lampiran Pedoman SKEM.',
      },
    ],
    warnings: [],
    questions: [],
    finalForm: {
      status: 'none',
    },
    reviews: [],
    timeline: [
      {
        field: 'review_status',
        from: null,
        to: 'queued',
        at: '2026-10-09T08:00:00.000Z',
        by: null,
        note: 'Berkas diunggah',
      },
      {
        field: 'review_status',
        from: 'queued',
        to: 'ready',
        at: '2026-10-09T08:01:23.000Z',
        by: 'ai_agent',
        note: 'Analisis AI selesai: Siap diajukan',
      },
    ],
    tokenUsage: {
      calls: 2,
      promptTokens: 1840,
      completionTokens: 312,
      cacheHits: 1,
    },
  };
}

/**
 * Mengambil detail pengajuan berdasarkan publicId.
 */
export async function getSubmissionDetail(publicId: string): Promise<SubmissionDetail> {
  try {
    return await apiClient.get<SubmissionDetail>(`/api/submissions/${publicId}`);
  } catch {
    // Fallback to mock data if backend route is not available or returns 404
    if (!mockStore[publicId]) {
      mockStore[publicId] = createDefaultMockSubmission(publicId);
    }
    return mockStore[publicId];
  }
}

/**
 * Memperbarui metadata pengajuan (aktivitas & klasifikasi SKEM).
 */
export async function patchSubmission(
  publicId: string,
  data: PatchSubmissionBody
): Promise<SubmissionDetail> {
  try {
    return await apiClient.patch<SubmissionDetail>(`/api/submissions/${publicId}`, data);
  } catch {
    // Mock update locally
    const current = mockStore[publicId] || createDefaultMockSubmission(publicId);

    const updatedActivity = {
      ...current.activity,
      ...(data.activity || {}),
    };

    const newCategory = data.skem?.categoryCode ?? current.skem.categoryCode;
    const newLevel = data.skem?.level !== undefined ? data.skem.level : current.skem.level;
    const newRole = data.skem?.roleInActivity !== undefined ? data.skem.roleInActivity : current.skem.roleInActivity;
    const newAchievement = data.skem?.achievement !== undefined ? data.skem.achievement : current.skem.achievement;

    // Recompute estimated credit from official credit table
    const calc = calculateEstimatedCredit({
      komponen: current.skem.komponen,
      categoryCode: newCategory,
      level: newLevel,
      role: newRole,
    });

    const updatedSkem = {
      ...current.skem,
      categoryCode: newCategory,
      level: newLevel,
      roleInActivity: newRole,
      achievement: newAchievement,
      creditEntryId: calc.entryId,
      estimatedCredit: calc.credit,
    };

    const updatedSubmission: SubmissionDetail = {
      ...current,
      activity: updatedActivity,
      skem: updatedSkem,
    };

    mockStore[publicId] = updatedSubmission;
    return updatedSubmission;
  }
}

/**
 * Mendapatkan URL signed berkas sertifikat PDF.
 */
export async function getCertificateUrl(
  publicId: string
): Promise<{ url: string; expiresIn: number }> {
  try {
    return await apiClient.get<{ url: string; expiresIn: number }>(
      `/api/submissions/${publicId}/certificate`
    );
  } catch {
    // Fallback URL for preview
    return {
      url: `/data/testset/cases/c001_juara2_lomba_desain.pdf`,
      expiresIn: 60,
    };
  }
}

/**
 * Mengajukan berkas ke Verifikator.
 */
export async function submitToVerifier(publicIds: string[]): Promise<void> {
  try {
    await apiClient.post('/api/submissions/submit', { publicIds });
  } catch {
    // If mock mode, update status to waiting_verifier
    publicIds.forEach((id) => {
      if (mockStore[id]) {
        mockStore[id] = {
          ...mockStore[id],
          status: 'waiting_verifier',
          timeline: [
            ...mockStore[id].timeline,
            {
              field: 'status',
              from: 'draft',
              to: 'waiting_verifier',
              at: new Date().toISOString(),
              by: 'mahasiswa',
              note: 'Diajukan ke Verifikator',
            },
          ],
        };
      }
    });
  }
}
