const textarea = document.getElementById('resume-input');
const button = document.getElementById('generate-btn');
const toast = document.getElementById('toast');

const TOAST_DURATION_MS = 4000;

let toastTimeoutId = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('toast--visible');
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, TOAST_DURATION_MS);
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.classList.toggle('generate-btn--loading', isLoading);
  button.textContent = isLoading ? 'Gerando PDF...' : 'Gerar PDF';
}

function triggerDownload(blob) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'curriculo.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

async function generatePdf() {
  const text = textarea.value.trim();

  if (!text) {
    showToast('Cole o texto do currículo antes de gerar o PDF.');
    textarea.focus();
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao gerar o PDF.');
    }

    const blob = await response.blob();
    triggerDownload(blob);
  } catch (error) {
    showToast(error.message || 'Erro inesperado ao gerar o PDF.');
  } finally {
    setLoading(false);
  }
}

button.addEventListener('click', generatePdf);

// Ctrl+Enter (or Cmd+Enter on macOS) generates the PDF without leaving the textarea.
textarea.addEventListener('keydown', (event) => {
  const isGenerateShortcut = (event.ctrlKey || event.metaKey) && event.key === 'Enter';
  if (isGenerateShortcut) {
    event.preventDefault();
    generatePdf();
  }
});

// Drag & drop: dropping a .txt file replaces the textarea content.
// Dropping selected plain text keeps the browser's native insert-at-cursor behavior.
['dragenter', 'dragover'].forEach((eventName) => {
  textarea.addEventListener(eventName, (event) => {
    event.preventDefault();
    textarea.classList.add('resume-input--drag-over');
  });
});

['dragleave', 'dragend', 'drop'].forEach((eventName) => {
  textarea.addEventListener(eventName, () => {
    textarea.classList.remove('resume-input--drag-over');
  });
});

textarea.addEventListener('drop', async (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  event.preventDefault();

  try {
    const content = await file.text();
    textarea.value = content;
  } catch {
    showToast('Não foi possível ler o arquivo solto.');
  }
});
