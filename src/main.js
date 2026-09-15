/**
 * Main Application — CoverCraft Cover Letter Generator
 * Pure Gemini AI Flow (Vision OCR & Smart Drafting)
 */
import './style.css';
import { generateLetterID, generateLetterEN, renderLetterHTML } from './templates.js';
import { generateDOCX, generatePDF } from './generator.js';
import { analyzeJobAndCVWithGemini, draftLetterWithGemini, getGeminiApiKey } from './gemini.js';

// ============================================
// Application State
// ============================================
const state = {
  currentStep: 1,
  jobFile: null,
  cvFile: null,
  language: 'id',
  showEducation: true,
  showAttachments: true,
  attachments: [
    'Daftar Riwayat Hidup (CV)',
    'Ijazah Terakhir',
    'Transkrip Nilai',
    'Portofolio Proyek',
  ],
  letterDate: new Date().toISOString().split('T')[0],
  aiMatchSummary: '',
  aiParagraphs: null,
  // Extracted & editable data
  companyName: '',
  companyCity: '',
  position: '',
  jobSource: '',
  qualifications: '',
  fullName: '',
  phone: '',
  senderCity: '',
  university: '',
  degree: '',
  gpa: '',
  experience: '',
  skills: '',
  // Generated letter
  currentLetter: null,
  isEditing: false,
};

// ============================================
// DOM References
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================
// Step Navigation
// ============================================
function goToStep(step) {
  if (step < 1 || step > 5) return;

  const oldStep = state.currentStep;
  state.currentStep = step;

  // Update panels
  $$('.step-panel').forEach((panel) => panel.classList.remove('active'));
  $(`#step${step}`).classList.add('active');

  // Update progress bar
  $$('.step-item').forEach((item, i) => {
    const stepNum = i + 1;
    item.classList.remove('active', 'completed');
    if (stepNum === step) {
      item.classList.add('active');
    } else if (stepNum < step) {
      item.classList.add('completed');
    }
  });

  // Update connectors
  $$('.step-connector').forEach((conn, i) => {
    conn.classList.toggle('active', i + 1 < step);
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Step-specific actions
  if (step === 2 && oldStep === 1) {
    startGeminiAnalysis();
  }
  if (step === 4) {
    renderPreview();
  }
}

// ============================================
// File Upload Handling
// ============================================
function setupUpload(zoneId, inputId, previewId, type) {
  const zone = $(`#${zoneId}`);
  const input = $(`#${inputId}`);

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, type);
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file, type);
  });
}

function handleFile(file, type) {
  if (file.size > 10 * 1024 * 1024) {
    alert('Ukuran file terlalu besar. Maksimum 10MB.');
    return;
  }

  if (type === 'job') {
    if (!file.type.startsWith('image/')) {
      alert('Screenshot lowongan harus berupa gambar (JPG/PNG).');
      return;
    }
    state.jobFile = file;
    showJobPreview(file);
  } else {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('CV harus berupa PDF atau gambar (JPG/PNG).');
      return;
    }
    state.cvFile = file;
    showCVPreview(file);
  }

  updateStep1Button();
}

function showJobPreview(file) {
  const zone = $('#jobUploadZone');
  const preview = $('#jobPreview');
  const img = $('#jobPreviewImg');

  zone.style.display = 'none';
  preview.style.display = 'block';
  img.src = URL.createObjectURL(file);
}

function showCVPreview(file) {
  const zone = $('#cvUploadZone');
  const preview = $('#cvPreview');
  const content = $('#cvPreviewContent');

  zone.style.display = 'none';
  preview.style.display = 'block';

  if (file.type.startsWith('image/')) {
    content.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Preview CV" style="width:100%;max-height:280px;object-fit:contain;border-radius:10px;background:rgba(255,255,255,0.05);" />`;
  } else {
    content.innerHTML = `
      <div class="cv-file-info">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <div>
          <div class="file-name">${file.name}</div>
          <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
        </div>
      </div>
    `;
  }
}

function removeFile(type) {
  if (type === 'job') {
    state.jobFile = null;
    $('#jobUploadZone').style.display = '';
    $('#jobPreview').style.display = 'none';
    $('#jobFileInput').value = '';
  } else {
    state.cvFile = null;
    $('#cvUploadZone').style.display = '';
    $('#cvPreview').style.display = 'none';
    $('#cvFileInput').value = '';
  }
  updateStep1Button();
}

function updateStep1Button() {
  $('#btnToStep2').disabled = !(state.jobFile && state.cvFile);
}

// ============================================
// Gemini AI Document Analysis
// ============================================
async function startGeminiAnalysis() {
  const loading = $('#ocrLoading');
  const content = $('#reviewContent');
  const statusEl = $('#ocrStatus');
  const aiBanner = $('#aiInsightBanner');
  const aiBannerText = $('#aiMatchSummaryText');

  loading.style.display = 'flex';
  content.style.display = 'none';
  aiBanner.style.display = 'none';

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    loading.style.display = 'none';
    content.style.display = 'block';
    alert('API Key Gemini belum diset. Tambahkan VITE_GEMINI_API_KEY di file .env.');
    populateReviewFields();
    return;
  }

  try {
    statusEl.textContent = 'Menganalisis screenshot lowongan & CV dengan Gemini AI Vision...';
    const aiResult = await analyzeJobAndCVWithGemini(state.jobFile, state.cvFile, apiKey);

    state.companyName = aiResult.companyName || '';
    state.companyCity = aiResult.companyCity || '';
    state.position = aiResult.position || '';
    state.jobSource = aiResult.jobSource || '';
    state.qualifications = aiResult.qualifications || '';
    state.fullName = aiResult.fullName || '';
    state.phone = aiResult.phone || '';
    state.senderCity = aiResult.senderCity || '';
    state.university = aiResult.university || '';
    state.degree = aiResult.degree || '';
    state.gpa = aiResult.gpa || '';
    state.experience = aiResult.experience || '';
    state.skills = aiResult.skills || '';
    state.aiMatchSummary = aiResult.aiMatchSummary || '';

    if (state.aiMatchSummary) {
      aiBannerText.textContent = state.aiMatchSummary;
      aiBanner.style.display = 'flex';
    }

    populateReviewFields();
    loading.style.display = 'none';
    content.style.display = 'block';
  } catch (err) {
    console.error('Gemini AI Analysis Error:', err);
    alert(`Analisis Gemini AI Gagal: ${err.message}`);
    loading.style.display = 'none';
    content.style.display = 'block';
    populateReviewFields();
  }
}

function populateReviewFields() {
  $('#companyName').value = state.companyName;
  $('#companyCity').value = state.companyCity;
  $('#jobPosition').value = state.position;
  $('#jobSource').value = state.jobSource;
  $('#jobQualifications').value = state.qualifications;
  $('#fullName').value = state.fullName;
  $('#phone').value = state.phone;
  $('#senderCity').value = state.senderCity;
  $('#university').value = state.university;
  $('#degree').value = state.degree;
  $('#gpa').value = state.gpa;
  $('#experience').value = state.experience;
  $('#skills').value = state.skills;
}

function saveReviewFields() {
  state.companyName = $('#companyName').value;
  state.companyCity = $('#companyCity').value;
  state.position = $('#jobPosition').value;
  state.jobSource = $('#jobSource').value;
  state.qualifications = $('#jobQualifications').value;
  state.fullName = $('#fullName').value;
  state.phone = $('#phone').value;
  state.senderCity = $('#senderCity').value;
  state.university = $('#university').value;
  state.degree = $('#degree').value;
  state.gpa = $('#gpa').value;
  state.experience = $('#experience').value;
  state.skills = $('#skills').value;
}

// ============================================
// Customize Options
// ============================================
function setupCustomize() {
  $('#langId').addEventListener('click', () => {
    state.language = 'id';
    $('#langId').classList.add('active');
    $('#langEn').classList.remove('active');
  });

  $('#langEn').addEventListener('click', () => {
    state.language = 'en';
    $('#langEn').classList.add('active');
    $('#langId').classList.remove('active');
  });

  $('#showEducation').addEventListener('change', (e) => {
    state.showEducation = e.target.checked;
  });

  $('#showAttachments').addEventListener('change', (e) => {
    state.showAttachments = e.target.checked;
    const list = $('#attachmentsList');
    if (e.target.checked) {
      list.classList.remove('hidden');
    } else {
      list.classList.add('hidden');
    }
  });

  $('#addAttachment').addEventListener('click', () => {
    addAttachmentItem('');
  });

  $('#letterDate').value = state.letterDate;
  $('#letterDate').addEventListener('change', (e) => {
    state.letterDate = e.target.value;
  });

  setupAttachmentRemoveButtons();
}

function addAttachmentItem(value) {
  const list = $('#attachmentsList');
  const addBtn = $('#addAttachment');

  const item = document.createElement('div');
  item.className = 'attachment-item';
  item.innerHTML = `
    <input type="text" value="${value}" class="attachment-input" placeholder="Nama lampiran..." />
    <button class="btn-icon btn-remove-attachment" title="Hapus">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  list.insertBefore(item, addBtn);

  item.querySelector('.btn-remove-attachment').addEventListener('click', () => {
    item.remove();
  });

  item.querySelector('.attachment-input').focus();
}

function setupAttachmentRemoveButtons() {
  $$('.btn-remove-attachment').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.attachment-item').remove();
    });
  });
}

function collectAttachments() {
  const inputs = $$('#attachmentsList .attachment-input');
  state.attachments = Array.from(inputs)
    .map((input) => input.value.trim())
    .filter(Boolean);
}

// ============================================
// Preview & Edit
// ============================================
async function renderPreview() {
  const preview = $('#documentPreview');
  const generateFn = state.language === 'id' ? generateLetterID : generateLetterEN;
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    preview.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">✨ Menyusun narasi surat lamaran dengan Gemini AI...</div>`;
    try {
      const aiResult = await draftLetterWithGemini(state, apiKey, state.language);
      state.aiParagraphs = aiResult;
    } catch (err) {
      console.warn('AI Letter draft error:', err);
      state.aiParagraphs = null;
    }
  } else {
    state.aiParagraphs = null;
  }

  state.currentLetter = generateFn({
    senderCity: state.senderCity,
    letterDate: state.letterDate,
    companyName: state.companyName,
    companyCity: state.companyCity,
    position: state.position,
    jobSource: state.jobSource,
    qualifications: state.qualifications,
    fullName: state.fullName,
    phone: state.phone,
    university: state.university,
    degree: state.degree,
    gpa: state.gpa,
    experience: state.experience,
    skills: state.skills,
    showEducation: state.showEducation,
    showAttachments: state.showAttachments,
    attachments: state.attachments,
    aiParagraphs: state.aiParagraphs,
  });

  preview.innerHTML = renderLetterHTML(state.currentLetter);
  preview.contentEditable = 'false';
  state.isEditing = false;
  updateEditButton();
}

function toggleEditMode() {
  const preview = $('#documentPreview');
  state.isEditing = !state.isEditing;
  preview.contentEditable = state.isEditing ? 'true' : 'false';
  updateEditButton();

  if (state.isEditing) {
    preview.focus();
  }
}

function updateEditButton() {
  const btn = $('#btnEditMode');
  if (state.isEditing) {
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Selesai Edit
    `;
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-outline');
  } else {
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit Surat
    `;
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
  }
}

// ============================================
// Download
// ============================================
function setupDownload() {
  $('#btnDownloadDocx').addEventListener('click', async () => {
    const btn = $('#btnDownloadDocx');
    btn.disabled = true;
    btn.textContent = 'Generating...';

    try {
      const filename = `Surat_Lamaran_${state.companyName.replace(/\s+/g, '_') || 'Perusahaan'}`;
      await generateDOCX(state.currentLetter, filename);
      showDownloadSuccess();
    } catch (err) {
      console.error('DOCX generation error:', err);
      alert('Gagal membuat file DOCX. Silakan coba lagi.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download DOCX
      `;
    }
  });

  $('#btnDownloadPdf').addEventListener('click', () => {
    try {
      const letterHTML = $('#documentPreview').innerHTML;
      const filename = `Surat_Lamaran_${state.companyName.replace(/\s+/g, '_') || 'Perusahaan'}`;
      generatePDF(letterHTML, filename);
      showDownloadSuccess();
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Gagal membuat file PDF. Silakan coba lagi.');
    }
  });
}

function showDownloadSuccess() {
  const success = $('#downloadSuccess');
  success.style.display = 'block';
  setTimeout(() => {
    success.style.display = 'none';
  }, 4000);
}

// ============================================
// Navigation Button Setup
// ============================================
function setupNavigation() {
  $('#btnToStep2').addEventListener('click', () => {
    goToStep(2);
  });

  $('#btnBackTo1').addEventListener('click', () => {
    goToStep(1);
  });

  $('#btnToStep3').addEventListener('click', () => {
    saveReviewFields();
    goToStep(3);
  });

  $('#btnBackTo2').addEventListener('click', () => {
    goToStep(2);
  });

  $('#btnToStep4').addEventListener('click', () => {
    collectAttachments();
    goToStep(4);
  });

  $('#btnBackTo3').addEventListener('click', () => {
    goToStep(3);
  });

  $('#btnToStep5').addEventListener('click', () => {
    goToStep(5);
  });

  $('#btnBackTo4').addEventListener('click', () => {
    goToStep(4);
  });

  $('#btnStartOver').addEventListener('click', () => {
    if (confirm('Mulai dari awal? Data yang belum diunduh akan hilang.')) {
      location.reload();
    }
  });

  $('#btnEditMode').addEventListener('click', toggleEditMode);
  $('#jobRemoveBtn').addEventListener('click', () => removeFile('job'));
  $('#cvRemoveBtn').addEventListener('click', () => removeFile('cv'));
}

// ============================================
// Initialization
// ============================================
function init() {
  setupUpload('jobUploadZone', 'jobFileInput', 'jobPreview', 'job');
  setupUpload('cvUploadZone', 'cvFileInput', 'cvPreview', 'cv');
  setupNavigation();
  setupCustomize();
  setupDownload();

  $('#letterDate').value = state.letterDate;
}

document.addEventListener('DOMContentLoaded', init);
