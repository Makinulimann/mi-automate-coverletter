/**
 * Templates Module — Cover letter templates in Indonesian & English
 * Generates letter content based on extracted/edited data
 */

/**
 * Format a date in Indonesian locale
 * @param {Date} date
 * @returns {string} e.g. "22 Mei 2024"
 */
function formatDateID(date) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date in English locale
 * @param {Date} date
 * @returns {string} e.g. "May 22, 2024"
 */
function formatDateEN(date) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Convert number to Indonesian word
 * @param {number} num
 * @returns {string}
 */
function numberToWordID(num) {
  const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh'];
  return words[num] || String(num);
}

/**
 * Find relevant experience keywords from qualifications
 * @param {string} qualifications - Job qualifications text
 * @param {string} experience - User's experience text
 * @param {string} skills - User's skills text
 * @returns {string[]} Matched keywords
 */
function findRelevantKeywords(qualifications, experience, skills) {
  if (!qualifications) return [];

  const combined = `${experience} ${skills}`.toLowerCase();
  const qualLower = qualifications.toLowerCase();

  // Common tech/skill keywords to match
  const keywords = new Set();
  const patterns = [
    /\b(php|java|javascript|python|ruby|go|golang|c\+\+|c#|swift|kotlin|dart|typescript|rust|scala|r|sql)\b/gi,
    /\b(react|angular|vue|next\.?js|nuxt|svelte|express|laravel|django|flask|spring|node\.?js|\.net)\b/gi,
    /\b(mysql|postgresql|mongodb|redis|sqlite|oracle|sql server|mariadb|firebase)\b/gi,
    /\b(rest\s*api|graphql|docker|kubernetes|aws|gcp|azure|ci\/cd|git|linux)\b/gi,
    /\b(html|css|sass|tailwind|bootstrap|figma|ui\/ux|photoshop|illustrator)\b/gi,
    /\b(machine learning|data analysis|data science|deep learning|ai|artificial intelligence)\b/gi,
    /\b(agile|scrum|kanban|jira|confluence|trello)\b/gi,
    /\b(hris|erp|crm|sap|odoo)\b/gi,
  ];

  for (const pattern of patterns) {
    const qualMatches = qualLower.match(pattern) || [];
    for (const match of qualMatches) {
      if (combined.includes(match.toLowerCase())) {
        keywords.add(match);
      }
    }
  }

  return [...keywords];
}

/**
 * Generate Indonesian cover letter content
 * @param {object} data - All letter data
 * @returns {object} Structured letter content
 */
export function generateLetterID(data) {
  const {
    senderCity, letterDate, companyName, companyCity, position, jobSource,
    qualifications, fullName, phone, university, degree, gpa,
    experience, skills, showEducation, showAttachments, attachments, aiParagraphs,
  } = data;

  const date = letterDate ? new Date(letterDate) : new Date();
  const formattedDate = `${senderCity || 'Kota'}, ${formatDateID(date)}`;
  const matchedKeywords = findRelevantKeywords(qualifications, experience, skills);

  // Build education sentence
  let educationSentence = '';
  if (showEducation && university) {
    educationSentence = `Saya merupakan lulusan ${degree || 'Sarjana'} dari ${university}`;
    if (gpa) {
      educationSentence += ` dengan IPK ${gpa}`;
    }
    educationSentence += '. ';
  }

  // Build skills/experience highlight
  let skillHighlight = '';
  if (matchedKeywords.length > 0) {
    skillHighlight = `kemampuan teknis mendalam dalam ${matchedKeywords.join(', ')}`;
  } else if (skills) {
    const skillList = skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
    skillHighlight = `kemampuan dalam ${skillList.join(', ')}`;
  }

  // Build experience sentence
  let experienceSentence = '';
  if (experience) {
    const expLines = experience.split('\n').filter(Boolean);
    if (expLines.length > 0) {
      experienceSentence = `Selama menempuh pendidikan dan melalui pengalaman profesional, saya telah mengasah ${skillHighlight || 'berbagai kemampuan teknis'}. Saya memiliki pengalaman nyata dalam ${expLines[0].replace(/^[-•●]\s*/, '')} yang relevan dengan kebutuhan pengembangan di ${companyName || 'perusahaan Anda'}.`;
    }
  } else if (skillHighlight) {
    experienceSentence = `Saya telah mengasah ${skillHighlight} yang relevan dengan kebutuhan di ${companyName || 'perusahaan Anda'}.`;
  }

  // Source info
  const sourceInfo = jobSource
    ? ` sebagaimana diinformasikan melalui ${jobSource}`
    : '';

  // Attachment section
  let attachmentSection = null;
  if (showAttachments && attachments && attachments.length > 0) {
    attachmentSection = {
      count: attachments.length,
      countWord: numberToWordID(attachments.length),
      items: attachments,
    };
  }

  const defaultParagraphs = [
    `Dengan hormat,`,
    `Melalui surat ini, saya menyampaikan ketertarikan saya yang besar untuk melamar posisi ${position || '[Posisi]'} di ${companyName || '[Nama Perusahaan]'}${sourceInfo}. Sebagai seorang profesional yang antusias di bidang ini, saya yakin kualifikasi saya akan memberikan nilai tambah bagi tim perusahaan Anda.`,
    `${educationSentence}${experienceSentence || `Saya memiliki ${skillHighlight || 'berbagai kemampuan'} yang relevan dengan posisi yang ditawarkan.`}`,
    `Saya memiliki dedikasi tinggi terhadap pekerjaan yang berkualitas. Saya berkomitmen untuk bekerja dengan penuh integritas, terus beradaptasi dengan perkembangan terbaru, dan memberikan kontribusi positif demi tercapainya target di ${companyName || 'perusahaan Anda'}.`,
  ];

  const paragraphs = aiParagraphs ? [
    `Dengan hormat,`,
    aiParagraphs.paragraph1,
    aiParagraphs.paragraph2,
    aiParagraphs.paragraph3,
  ] : defaultParagraphs;

  return {
    header: formattedDate,
    subject: `Hal: Lamaran Pekerjaan - ${position || '[Posisi]'}`,
    attachmentInfo: attachmentSection
      ? `Lampiran: ${attachmentSection.count} (${attachmentSection.countWord}) Berkas`
      : null,
    recipient: [
      'Kepada Yth.',
      'Bapak/Ibu HRD',
      companyName || '[Nama Perusahaan]',
      companyCity || '[Kota]',
    ],
    paragraphs,
    attachmentList: attachmentSection
      ? {
          intro: 'Sebagai bahan pertimbangan Bapak/Ibu, bersama surat ini saya lampirkan:',
          items: attachmentSection.items,
        }
      : null,
    closing: 'Besar harapan saya untuk dapat mendiskusikan kualifikasi saya lebih lanjut dalam sesi wawancara. Terima kasih atas waktu dan pertimbangan Bapak/Ibu. Saya sangat menantikan kesempatan untuk bergabung dengan tim Anda.',
    signature: {
      label: 'Hormat saya,',
      name: fullName || '[Nama Lengkap]',
      phone: phone || '[No. HP]',
    },
  };
}

/**
 * Generate English cover letter content
 * @param {object} data - All letter data
 * @returns {object} Structured letter content
 */
export function generateLetterEN(data) {
  const {
    senderCity, letterDate, companyName, companyCity, position, jobSource,
    qualifications, fullName, phone, university, degree, gpa,
    experience, skills, showEducation, showAttachments, attachments, aiParagraphs,
  } = data;

  const date = letterDate ? new Date(letterDate) : new Date();
  const formattedDate = `${senderCity || 'City'}, ${formatDateEN(date)}`;
  const matchedKeywords = findRelevantKeywords(qualifications, experience, skills);

  let educationSentence = '';
  if (showEducation && university) {
    educationSentence = `I hold a ${degree || "Bachelor's"} degree from ${university}`;
    if (gpa) {
      educationSentence += ` with a GPA of ${gpa}`;
    }
    educationSentence += '. ';
  }

  let skillHighlight = '';
  if (matchedKeywords.length > 0) {
    skillHighlight = `strong proficiency in ${matchedKeywords.join(', ')}`;
  } else if (skills) {
    const skillList = skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
    skillHighlight = `proficiency in ${skillList.join(', ')}`;
  }

  let experienceSentence = '';
  if (experience) {
    const expLines = experience.split('\n').filter(Boolean);
    if (expLines.length > 0) {
      experienceSentence = `Through my education and professional experience, I have developed ${skillHighlight || 'various technical skills'}. I have hands-on experience in ${expLines[0].replace(/^[-•●]\s*/, '')} that is directly relevant to the needs at ${companyName || 'your company'}.`;
    }
  } else if (skillHighlight) {
    experienceSentence = `I have developed ${skillHighlight} that is relevant to the requirements at ${companyName || 'your company'}.`;
  }

  const sourceInfo = jobSource ? ` as advertised on ${jobSource}` : '';

  let attachmentSection = null;
  if (showAttachments && attachments && attachments.length > 0) {
    attachmentSection = {
      count: attachments.length,
      items: attachments,
    };
  }

  const defaultParagraphs = [
    `Dear Hiring Manager,`,
    `I am writing to express my strong interest in the ${position || '[Position]'} position at ${companyName || '[Company Name]'}${sourceInfo}. As a dedicated professional in this field, I am confident that my qualifications will bring value to your team.`,
    `${educationSentence}${experienceSentence || `I possess ${skillHighlight || 'various relevant skills'} aligned with the position offered.`}`,
    `I am highly dedicated to producing quality work. I am committed to working with integrity, continuously adapting to the latest developments, and making positive contributions toward achieving the goals at ${companyName || 'your company'}.`,
  ];

  const paragraphs = aiParagraphs ? [
    `Dear Hiring Manager,`,
    aiParagraphs.paragraph1,
    aiParagraphs.paragraph2,
    aiParagraphs.paragraph3,
  ] : defaultParagraphs;

  return {
    header: formattedDate,
    subject: `Subject: Job Application - ${position || '[Position]'}`,
    attachmentInfo: attachmentSection
      ? `Attachments: ${attachmentSection.count} Document(s)`
      : null,
    recipient: [
      'Dear Sir/Madam,',
      'Human Resources Department',
      companyName || '[Company Name]',
      companyCity || '[City]',
    ],
    paragraphs,
    attachmentList: attachmentSection
      ? {
          intro: 'For your consideration, I have enclosed the following documents:',
          items: attachmentSection.items,
        }
      : null,
    closing: 'I sincerely hope to discuss my qualifications further in an interview. Thank you for your time and consideration. I look forward to the opportunity of joining your team.',
    signature: {
      label: 'Sincerely,',
      name: fullName || '[Full Name]',
      phone: phone || '[Phone Number]',
    },
  };
}

/**
 * Render letter content to HTML for preview
 * @param {object} letter - Letter content object from generateLetterID/EN
 * @returns {string} HTML string
 */
export function renderLetterHTML(letter) {
  let html = '';

  // Header (date) — right aligned
  html += `<div class="letter-header">`;
  html += `<div class="letter-date">${letter.header}</div>`;
  html += `</div>`;

  // Subject
  html += `<div class="letter-subject">${letter.subject}</div>`;

  // Attachment info
  if (letter.attachmentInfo) {
    html += `<div class="letter-attachment-info">${letter.attachmentInfo}</div>`;
  }

  // Recipient
  html += `<div class="letter-recipient">`;
  for (const line of letter.recipient) {
    html += `<div>${line}</div>`;
  }
  html += `</div>`;

  // Body paragraphs
  html += `<div class="letter-body">`;
  for (const para of letter.paragraphs) {
    const isGreeting = para.startsWith('Dengan hormat') || para.startsWith('Dear');
    html += `<p class="${isGreeting ? 'no-indent' : ''}">${para}</p>`;
  }

  // Attachment list
  if (letter.attachmentList) {
    html += `<p class="no-indent">${letter.attachmentList.intro}</p>`;
    html += `<div class="letter-attachments"><ol>`;
    for (const item of letter.attachmentList.items) {
      html += `<li>${item}</li>`;
    }
    html += `</ol></div>`;
  }

  // Closing
  html += `<p class="no-indent">${letter.closing}</p>`;
  html += `</div>`;

  // Signature
  html += `<div class="letter-closing">`;
  html += `<div>${letter.signature.label}</div>`;
  html += `<div class="letter-signature">`;
  html += `<div class="name">${letter.signature.name}</div>`;
  html += `<div>${letter.signature.phone}</div>`;
  html += `</div>`;
  html += `</div>`;

  return html;
}
