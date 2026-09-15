/**
 * Gemini AI Module — Vision OCR, Information Extraction & Smart Letter Drafting
 * Uses Google Gemini API (gemini-2.5-flash)
 */

/**
 * Get Gemini API Key from .env or localStorage
 * @returns {string}
 */
export function getGeminiApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';
}

/**
 * Convert a File object to base64 data inline
 * @param {File} file
 * @returns {Promise<{inlineData: {data: string, mimeType: string}}>}
 */
async function fileToGenerativePart(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return {
    inlineData: {
      data: base64,
      mimeType: file.type || 'image/png',
    },
  };
}

/**
 * Extract text from PDF using PDF.js
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractPdfText(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  } catch (e) {
    console.warn('PDF text extraction notice:', e);
    return '';
  }
}

/**
 * Extract structured JSON data from job screenshot & CV using Gemini API
 * @param {File} jobFile - Screenshot of job posting (Image)
 * @param {File} cvFile - CV file (Image/PDF)
 * @param {string} [customApiKey] - Optional API key override
 * @returns {Promise<object>} Extracted structured data
 */
export async function analyzeJobAndCVWithGemini(jobFile, cvFile, customApiKey = '') {
  const apiKey = customApiKey || getGeminiApiKey();
  if (!apiKey) {
    throw new Error('API Key Gemini tidak terdeteksi. Silakan set VITE_GEMINI_API_KEY di file .env.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const parts = [];

  // 1. Add job posting screenshot (Image)
  if (jobFile && jobFile instanceof File) {
    const jobPart = await fileToGenerativePart(jobFile);
    parts.push(jobPart);
  }

  // 2. Add CV (Image or PDF text)
  let cvContextPrompt = '';
  if (cvFile && cvFile instanceof File) {
    if (cvFile.type.startsWith('image/')) {
      const cvPart = await fileToGenerativePart(cvFile);
      parts.push(cvPart);
    } else if (cvFile.type === 'application/pdf') {
      const pdfText = await extractPdfText(cvFile);
      if (pdfText && pdfText.trim().length > 30) {
        cvContextPrompt = `\nTeks CV Pelamar:\n${pdfText}\n`;
      } else {
        // Fallback: pass PDF as generative part if supported
        const cvPart = await fileToGenerativePart(cvFile);
        parts.push(cvPart);
      }
    }
  }

  const promptText = `
Anda adalah AI Spesialis HRD dan Analisis Rekrutmen Kerja.
Tugas Anda: Analisis screenshot lowongan kerja dan dokumen CV pelamar yang dilampirkan.

${cvContextPrompt}

Hasil analisis HARUS dalam format JSON murni persis berikut ini (tanpa teks ekstra atau markdown formatting):

{
  "companyName": "Nama Perusahaan yang membuka lowongan (contoh: PT Primagraha Keramindo)",
  "companyCity": "Kota Perusahaan (contoh: Jakarta / Jakarta Barat / Surabaya / Malang)",
  "position": "Posisi pekerjaan yang dilamar (contoh: PHP Developer)",
  "jobSource": "Platform / sumber info lowongan jika ada (contoh: LinkedIn / JobStreet)",
  "qualifications": "Daftar poin-poin kualifikasi & persyaratan utama lowongan",
  "fullName": "Nama lengkap pelamar dari CV",
  "phone": "Nomor WhatsApp / telepon pelamar dari CV",
  "senderCity": "Kota domisili / pengirim pelamar dari CV",
  "university": "Perguruan tinggi / universitas pelamar dari CV",
  "degree": "Gelar dan jurusan pelamar dari CV (contoh: S1 Sistem Informasi)",
  "gpa": "IPK pelamar jika tercantum di CV (contoh: 3.81)",
  "experience": "Ringkasan pengalaman kerja pelamar yang paling relevan dengan lowongan",
  "skills": "Keahlian / keahlian teknis pelamar yang relevan dipisahkan koma",
  "aiMatchSummary": "Penjelasan 1-2 kalimat mengapa latar belakang pelamar ini sangat cocok dengan posisi ini"
}
  `;

  parts.push({ text: promptText });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP ${response.status}: Gagal memanggil Gemini API`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) throw new Error('Respon dari Gemini API kosong.');

  const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedText);
}

/**
 * Generate AI-crafted professional cover letter paragraphs using Gemini
 * @param {object} data - Data collected from Step 2 & 3
 * @param {string} [customApiKey] - Optional API key override
 * @param {string} [language] - 'id' or 'en'
 * @returns {Promise<object>} Structured paragraphs object
 */
export async function draftLetterWithGemini(data, customApiKey = '', language = 'id') {
  const apiKey = customApiKey || getGeminiApiKey();
  if (!apiKey) {
    throw new Error('API Key Gemini tidak terdeteksi.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const isIndonesian = language === 'id';
  const langName = isIndonesian ? 'Bahasa Indonesia baku & profesional' : 'Professional English';

  const promptText = `
Anda adalah Pakar Penulisan Surat Lamaran Kerja (Cover Letter) Profesional.
Buatkan paragraf surat lamaran kerja yang elegan, sangat relevan, persuasif, dan profesional dalam ${langName}.

Data Pelamar & Lowongan Target:
- Nama Pelamar: ${data.fullName}
- No. HP: ${data.phone}
- Domisili: ${data.senderCity}
- Pendidikan: ${data.showEducation ? `${data.degree || ''} dari ${data.university || ''} (IPK: ${data.gpa || '-'})` : 'Sembunyikan'}
- Perusahaan Target: ${data.companyName} (${data.companyCity})
- Posisi Target: ${data.position}
- Sumber Lowongan: ${data.jobSource || 'informasi lowongan kerja'}
- Kualifikasi Lowongan: ${data.qualifications}
- Pengalaman Kerja Pelamar: ${data.experience}
- Skills Pelamar: ${data.skills}

Ketentuan Khusus Penulisan:
1. Susun 3 paragraf utama (body surat) yang kohesif:
   - Paragraf 1 (Pembuka): Menyebutkan ketertarikan melamar posisi ${data.position} di ${data.companyName} sebagaimana diinformasikan melalui ${data.jobSource || 'platform lowongan kerja'}.
   - Paragraf 2 (Penonjolan Kualifikasi): Menyebutkan latar belakang pendidikan dan MENONJOLKAN pengalaman & keahlian pelamar yang paling relevan dengan kualifikasi lowongan.
   - Paragraf 3 (Penutup & Dedikasi): Menekankan integritas, komitmen kontribusi positif, dan antusiasme untuk sesi wawancara.

Format output JSON murni (tanpa markdown code block):
{
  "paragraph1": "Isi paragraf pembuka",
  "paragraph2": "Isi paragraf penonjolan kualifikasi & pengalaman relevan",
  "paragraph3": "Isi paragraf dedikasi & komitmen"
}
  `;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP error ${response.status}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) throw new Error('Respon Gemini API kosong.');

  const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedText);
}
