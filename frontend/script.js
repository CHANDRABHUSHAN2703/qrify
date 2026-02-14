// frontend/script.js

const BACKEND_URL = "https://qrify-backend-r647.onrender.com";

// Toggle dark mode
document.getElementById('mode-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// Helper to add an item to history list
function addHistoryItem(action, text) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleString()}: [${action}] ${text}`;
  document.getElementById('history-list').prepend(li);
}

// Fetch and display history from the backend
async function loadHistory() {
  const res = await fetch(`${BACKEND_URL}/api/history`);
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  if (res.ok) {
    const data = await res.json();
    data.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${new Date(item.created_at).toLocaleString()}: [${item.action}] ${item.input_text || ''} → ${item.output_text || ''}`;
      list.appendChild(li);
    });
  }
}

// Generate QR code
document.getElementById('generate-btn').addEventListener('click', async () => {
  const url = document.getElementById('url-input').value;
  const color = document.getElementById('color-input').value;
  const size = parseInt(document.getElementById('size-input').value) || 200;
  const errorDiv = document.getElementById('generate-error');
  errorDiv.textContent = ''; 
  if (!url) {
    errorDiv.textContent = 'Uff oh you had forgotten to put it .. i mean URL.';
    return;
  }

  const res = await fetch(`${BACKEND_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, color, size })
  });
  const json = await res.json();
  if (json.error) {
    errorDiv.textContent = json.error;
    return;
  }

  const img = document.createElement('img');
  img.src = json.png;
  img.alt = 'QR Code';
  img.width = size;
  const qrResult = document.getElementById('qr-result');
  qrResult.innerHTML = '';
  qrResult.appendChild(img);

  document.getElementById('download-png').style.display = 'inline-block';
  document.getElementById('download-svg').style.display = 'inline-block';

  document.getElementById('download-png').onclick = () => {
    const a = document.createElement('a');
    a.href = json.png;
    a.download = 'qr-code.png';
    a.click();
  };

  document.getElementById('download-svg').onclick = () => {
    const svgBlob = new Blob([json.svg], { type: 'image/svg+xml' });
    const urlBlob = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = 'qr-code.svg';
    a.click();
  };

  addHistoryItem('Generate', url);
  loadHistory();
});

// Decode QR code from uploaded image
document.getElementById('decode-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('file-input');
  const errorDiv = document.getElementById('decode-error');
  errorDiv.textContent = ''; // Clear previous errors
  if (!fileInput.files.length) {
    errorDiv.textContent = 'I need a qr to decode na , just add that.';
    return;
  }

  const form = new FormData();
  form.append('qrfile', fileInput.files[0]);

  const res = await fetch(`${BACKEND_URL}/api/decode`, {
    method: 'POST',
    body: form
  });
  const json = await res.json();
  if (json.error) {
    errorDiv.textContent = json.error;
    return;
  }

  const decoded = document.getElementById('decoded-link');
  decoded.textContent = json.text;
  if (json.text.startsWith('http')) {
    const a = document.createElement('a');
    a.href = json.text;
    a.textContent = 'Follow Link.. only if you trust the source';
    a.target = '_blank';
    decoded.appendChild(document.createElement('br'));
    decoded.appendChild(a);
  }

  addHistoryItem('Decode', json.text);
  loadHistory();
});

// Load history on page load
loadHistory();
