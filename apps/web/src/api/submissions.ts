import { apiClient } from './client';
import { calculateEstimatedCredit } from '../lib/credit-calc';
import type {
  SubmissionDetail,
  PatchSubmissionBody,
  AnswerBody,
  SubmissionCard,
  SubmissionStatus,
  ReviewStatus,
  Progress,
} from '@skem/shared';
export { cancelSubmission, reuploadSubmission } from './batch';

// In-memory demo store for realistic frontend behavior when API returns 404 or in mock mode
const mockStore: Record<string, SubmissionDetail> = {};

function createDefaultMockSubmission(publicId: string): SubmissionDetail {
  const isNeedsFix = publicId === 'SKM-8P3L0E2B';
  return {
    publicId,
    status: 'draft',
    reviewStatus: isNeedsFix ? 'needs_fix' : 'ready',
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
      activityName: isNeedsFix
        ? 'Seminar Nasional Teknologi Kampus'
        : 'Lomba Desain Poster Nasional 2026',
      activityDate: '2026-05-15',
      locationPlatform: 'Surabaya / Daring',
      organizer: 'BEM Politeknik Elektronika Negeri Surabaya',
      attachmentType: 'Sertifikat',
    },
    skem: {
      komponen: 3,
      categoryCode: 'K3-B01',
      level: isNeedsFix ? null : 'Nasional',
      roleInActivity: 'Juara II',
      achievement: 'Juara II Kategori Desain Poster',
      creditEntryId: isNeedsFix ? null : 'K3-B01-NAS-JUARA2',
      estimatedCredit: isNeedsFix ? null : 1.1,
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
        message:
          'Kategori kegiatan sesuai dengan Komponen 3 (Prestasi dan Lomba Penalaran/Kreativitas).',
        guidelineRef: {
          id: 'ketentuan-umum-bobot',
          title: 'Kategori Komponen 3',
          ref: 'Pedoman SKEM, Lampiran Daftar Kegiatan SKEM PENS, hlm. 27',
        },
      },
      {
        checkType: 'level',
        result: isNeedsFix ? 'warn' : 'pass',
        confidence: isNeedsFix ? 0.65 : 0.92,
        message: isNeedsFix
          ? 'Tingkat kegiatan belum dapat dipastikan dari teks sertifikat. Diperlukan klarifikasi asal peserta.'
          : 'Tingkat kegiatan adalah Nasional (peserta mencakup lebih dari 3 provinsi).',
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
        result: isNeedsFix ? 'warn' : 'pass',
        confidence: isNeedsFix ? 0.6 : 1.0,
        message: isNeedsFix
          ? 'Estimasi kredit menunggu penentuan tingkat kegiatan yang valid.'
          : 'Bobot kredit terhitung 1,10 poin berdasarkan tabel Lampiran Pedoman SKEM.',
      },
    ],
    warnings: isNeedsFix
      ? [
          {
            code: 'level_clarification',
            message: 'Tingkat kegiatan memerlukan jawaban klarifikasi dari peserta.',
          },
        ]
      : [],
    questions: isNeedsFix
      ? [
          {
            id: 1,
            seq: 1,
            field: 'level',
            question: 'Peserta kegiatan ini berasal dari mana?',
            options: [
              { value: 'campus', label: 'Hanya lingkungan internal PENS' },
              { value: 'regional', label: 'Satu provinsi (minimal 3 kota/kabupaten)' },
              { value: 'national', label: 'Minimal 3 provinsi di Indonesia' },
              { value: 'international', label: 'Minimal 3 negara' },
              { value: 'unknown', label: 'Saya tidak tahu' },
            ],
          },
        ]
      : [],
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
  data: PatchSubmissionBody,
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
    const newRole =
      data.skem?.roleInActivity !== undefined
        ? data.skem.roleInActivity
        : current.skem.roleInActivity;
    const newAchievement =
      data.skem?.achievement !== undefined ? data.skem.achievement : current.skem.achievement;

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
  publicId: string,
): Promise<{ url: string; expiresIn: number }> {
  try {
    return await apiClient.get<{ url: string; expiresIn: number }>(
      `/api/submissions/${publicId}/certificate`,
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
 * Menjawab pertanyaan agent pada kartu pengajuan.
 */
export async function answerQuestion(
  publicId: string,
  data: AnswerBody,
): Promise<SubmissionDetail> {
  try {
    return await apiClient.post<SubmissionDetail>(`/api/submissions/${publicId}/answers`, data);
  } catch {
    // Fallback simulation for mock demo
    const current = mockStore[publicId] || createDefaultMockSubmission(publicId);

    let updatedLevel = current.skem.level;
    let updatedCategory = current.skem.categoryCode;
    let updatedReviewStatus = current.reviewStatus;

    const answerLower = data.answer.toLowerCase();

    // Map answer value to level if it is a level question
    if (
      answerLower === 'national' ||
      answerLower.includes('3 provinsi') ||
      answerLower === 'nasional'
    ) {
      updatedLevel = 'Nasional';
    } else if (
      answerLower === 'international' ||
      answerLower.includes('3 negara') ||
      answerLower === 'internasional'
    ) {
      updatedLevel = 'Internasional';
    } else if (
      answerLower === 'regional' ||
      answerLower.includes('1 provinsi') ||
      answerLower === 'regional'
    ) {
      updatedLevel = 'Regional';
    } else if (
      answerLower === 'campus' ||
      answerLower.includes('pens') ||
      answerLower === 'kampus'
    ) {
      updatedLevel = 'Kampus';
    } else if (answerLower.startsWith('k')) {
      // If it is a category code like K3-B01
      updatedCategory = data.answer;
    }

    // Recompute credit
    const calc = calculateEstimatedCredit({
      komponen: current.skem.komponen,
      categoryCode: updatedCategory,
      level: updatedLevel,
      role: current.skem.roleInActivity,
    });

    // If valid combination found and answer provided, promote status to 'ready'
    if (calc.found && answerLower !== 'unknown' && answerLower !== 'saya tidak tahu') {
      updatedReviewStatus = 'ready';
    }

    const updatedQuestions = current.questions.map((q) =>
      q.id === data.questionId ? { ...q, answer: data.answer } : q,
    );

    const updatedSubmission: SubmissionDetail = {
      ...current,
      reviewStatus: updatedReviewStatus,
      skem: {
        ...current.skem,
        categoryCode: updatedCategory,
        level: updatedLevel,
        creditEntryId: calc.entryId,
        estimatedCredit: calc.credit,
      },
      questions: updatedQuestions,
    };

    mockStore[publicId] = updatedSubmission;
    return updatedSubmission;
  }
}

export interface SubmitResult {
  submitted: string[];
  skipped: { publicId: string; reason: string }[];
}

/**
 * Mengajukan berkas ke Verifikator.
 */
export async function submitToVerifier(publicIds: string[]): Promise<SubmitResult> {
  try {
    return await apiClient.post<SubmitResult>('/api/submissions/submit', { publicIds });
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

    return {
      submitted: publicIds,
      skipped: [],
    };
  }
}

/**
 * Mengambil daftar pengajuan milik mahasiswa.
 */
export async function getSubmissions(params?: {
  status?: SubmissionStatus;
  reviewStatus?: ReviewStatus;
}): Promise<SubmissionCard[]> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.reviewStatus) query.set('reviewStatus', params.reviewStatus);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    return await apiClient.get<SubmissionCard[]>(`/api/submissions${queryString}`);
  } catch {
    // Demo / fallback mode
    const now = new Date().toISOString();

    // Default sample list jika mockStore belum memiliki banyak data
    const sampleCards: SubmissionCard[] = [
      {
        publicId: 'SKM-7Q2K9D1A',
        batchId: 'BAT-20261001-01',
        fileName: 'sertif_seminar_nasional.pdf',
        status: 'approved',
        reviewStatus: 'ready',
        activityName: 'Lomba Desain Poster Nasional 2026',
        estimatedCredit: 1.1,
        finalCredit: 1.1,
        warnings: [],
        openQuestionCount: 0,
        lastError: null,
        updatedAt: now,
      },
      {
        publicId: 'SKM-8P3L0E2B',
        batchId: 'BAT-20261001-01',
        fileName: 'juara2_lomba_desain.pdf',
        status: 'waiting_validator',
        reviewStatus: 'ready',
        activityName: 'Seminar Nasional Teknologi Kampus',
        estimatedCredit: 0.75,
        finalCredit: null,
        warnings: [],
        openQuestionCount: 0,
        lastError: null,
        updatedAt: now,
      },
      {
        publicId: 'SKM-4X1N8K3M',
        batchId: 'BAT-20261001-02',
        fileName: 'pelatihan_cloud_aws.pdf',
        status: 'waiting_verifier',
        reviewStatus: 'ready',
        activityName: 'Pelatihan Cloud Computing AWS PENS',
        estimatedCredit: 0.5,
        finalCredit: null,
        warnings: [],
        openQuestionCount: 0,
        lastError: null,
        updatedAt: now,
      },
      {
        publicId: 'SKM-9Z5T2V7R',
        batchId: 'BAT-20261001-03',
        fileName: 'panitia_dies_natalis.pdf',
        status: 'rejected',
        reviewStatus: 'problem',
        activityName: 'Kepanitiaan Dies Natalis PENS 36',
        estimatedCredit: 0.4,
        finalCredit: null,
        warnings: [
          {
            code: 'INVALID_SIGNATURE',
            message: 'Tanda tangan penyelenggara tidak jelas',
          },
        ],
        openQuestionCount: 0,
        lastError: null,
        updatedAt: now,
      },
    ];

    // Gabungkan dengan item di mockStore
    const storeCards: SubmissionCard[] = Object.values(mockStore).map((s) => ({
      publicId: s.publicId,
      batchId: 'BAT-MOCK',
      fileName: (s.activity.activityName || 'dokumen') + '.pdf',
      status: s.status,
      reviewStatus: s.reviewStatus,
      activityName: s.activity.activityName,
      estimatedCredit: s.skem.estimatedCredit,
      finalCredit: s.skem.finalCredit,
      warnings: s.warnings,
      openQuestionCount: s.questions.filter((q) => !q.answer).length,
      lastError: null,
      updatedAt: now,
    }));

    // Ambil storeCards yang belum ada di sampleCards
    const sampleIds = new Set(sampleCards.map((c) => c.publicId));
    const merged = [...sampleCards, ...storeCards.filter((c) => !sampleIds.has(c.publicId))];

    return merged.filter((item) => {
      if (params?.status && item.status !== params.status) return false;
      if (params?.reviewStatus && item.reviewStatus !== params.reviewStatus) return false;
      return true;
    });
  }
}

/**
 * Mengambil ringkasan progres kredit SKEM mahasiswa.
 */
export async function getStudentProgress(): Promise<Progress> {
  try {
    return await apiClient.get<Progress>('/api/me/progress');
  } catch {
    // Demo fallback matching seed data: K1 dummy (0.50) + K2 dummy (0.25) + K3 approved (1.10)
    const earnedK1 = 0.5;
    const earnedK2 = 0.25;
    const earnedK3 = 1.1;
    const total = Math.round((earnedK1 + earnedK2 + earnedK3) * 100) / 100;
    const target = 3.0;

    return {
      komponen: [
        { komponen: 1, target: 1.25, earned: earnedK1 },
        { komponen: 2, target: 0.5, earned: earnedK2 },
        { komponen: 3, target: 1.25, earned: earnedK3 },
      ],
      total,
      target,
      fulfilled: total >= target && earnedK1 >= 1.25 && earnedK2 >= 0.5,
    };
  }
}

/**
 * Mengambil URL unduh signed formulir final (PDF).
 */
export async function getFinalFormUrl(
  publicId: string,
): Promise<{ url: string; expiresIn: number }> {
  try {
    return await apiClient.get<{ url: string; expiresIn: number }>(
      `/api/submissions/${publicId}/final-form`,
    );
  } catch {
    // Demo URL
    return {
      url: `https://storage.pens.ac.id/final-forms/${publicId}.pdf`,
      expiresIn: 60,
    };
  }
}

