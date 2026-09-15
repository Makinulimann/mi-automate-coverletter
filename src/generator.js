/**
 * Generator Module — DOCX & PDF document generation
 * Uses the 'docx' library for Word document creation
 */
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, TabStopPosition, TabStopType, convertMillimetersToTwip,
  UnderlineType,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Generate and download a DOCX file from letter content
 * @param {object} letter - Letter content object from templates
 * @param {string} filename - Output filename (without extension)
 */
export async function generateDOCX(letter, filename) {
  const children = [];

  // Helper to create a paragraph
  const makeParagraph = (text, options = {}) => {
    const {
      bold = false,
      alignment = AlignmentType.LEFT,
      spacing = { after: 100 },
      indent = {},
      font = 'Times New Roman',
      size = 24, // 12pt in half-points
      underline,
    } = options;

    return new Paragraph({
      alignment,
      spacing,
      indent,
      children: [
        new TextRun({
          text,
          bold,
          font,
          size,
          underline: underline ? { type: UnderlineType.SINGLE } : undefined,
        }),
      ],
    });
  };

  // Date — right aligned
  children.push(makeParagraph(letter.header, {
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80 },
  }));

  // Empty line
  children.push(makeParagraph('', { spacing: { after: 80 } }));

  // Subject — bold
  children.push(makeParagraph(letter.subject, {
    bold: true,
    spacing: { after: 40 },
  }));

  // Attachment info
  if (letter.attachmentInfo) {
    children.push(makeParagraph(letter.attachmentInfo, {
      spacing: { after: 200 },
    }));
  } else {
    children.push(makeParagraph('', { spacing: { after: 120 } }));
  }

  // Recipient
  for (const line of letter.recipient) {
    children.push(makeParagraph(line, {
      spacing: { after: 20 },
    }));
  }

  // Empty line before body
  children.push(makeParagraph('', { spacing: { after: 200 } }));

  // Body paragraphs
  for (let i = 0; i < letter.paragraphs.length; i++) {
    const para = letter.paragraphs[i];
    const isGreeting = para.startsWith('Dengan hormat') || para.startsWith('Dear');

    children.push(makeParagraph(para, {
      alignment: isGreeting ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
      indent: isGreeting ? {} : { firstLine: convertMillimetersToTwip(10) },
      spacing: { after: 200 },
    }));
  }

  // Attachment list
  if (letter.attachmentList) {
    children.push(makeParagraph(letter.attachmentList.intro, {
      spacing: { after: 80 },
    }));

    for (let i = 0; i < letter.attachmentList.items.length; i++) {
      children.push(makeParagraph(`${i + 1}. ${letter.attachmentList.items[i]}`, {
        indent: { left: convertMillimetersToTwip(10) },
        spacing: { after: 40 },
      }));
    }

    children.push(makeParagraph('', { spacing: { after: 100 } }));
  }

  // Closing paragraph
  children.push(makeParagraph(letter.closing, {
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 300 },
  }));

  // Signature label
  children.push(makeParagraph(letter.signature.label, {
    spacing: { after: 600 },
  }));

  // Name — bold & underlined
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: letter.signature.name,
          bold: true,
          underline: { type: UnderlineType.SINGLE },
          font: 'Times New Roman',
          size: 24,
        }),
      ],
    })
  );

  // Phone
  children.push(makeParagraph(letter.signature.phone, {
    spacing: { after: 0 },
  }));

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
              bottom: convertMillimetersToTwip(25),
              left: convertMillimetersToTwip(30),
            },
          },
        },
        children,
      },
    ],
  });

  // Generate and save
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

/**
 * Generate and download a PDF using browser print
 * Opens a new window with the letter content styled for printing
 * @param {string} letterHTML - HTML content of the letter
 * @param {string} filename - Output filename
 */
export function generatePDF(letterHTML, filename) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup diblokir oleh browser. Izinkan popup untuk mengunduh PDF.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        @page {
          size: A4;
          margin: 25mm 25mm 25mm 30mm;
        }
        body {
          font-family: 'Times New Roman', 'Georgia', serif;
          font-size: 12pt;
          line-height: 1.8;
          color: #000;
          margin: 0;
          padding: 0;
        }
        .letter-header {
          text-align: right;
          margin-bottom: 24px;
        }
        .letter-subject {
          font-weight: bold;
          margin-bottom: 4px;
        }
        .letter-attachment-info {
          margin-bottom: 16px;
        }
        .letter-recipient {
          margin-bottom: 24px;
        }
        .letter-body p {
          text-align: justify;
          text-indent: 40px;
          margin-bottom: 12px;
          margin-top: 0;
        }
        .letter-body p.no-indent {
          text-indent: 0;
        }
        .letter-attachments {
          margin: 16px 0;
        }
        .letter-attachments ol {
          margin-left: 20px;
        }
        .letter-attachments li {
          margin-bottom: 4px;
        }
        .letter-closing {
          margin-top: 24px;
        }
        .letter-signature {
          margin-top: 60px;
        }
        .letter-signature .name {
          font-weight: bold;
          text-decoration: underline;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      ${letterHTML}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
