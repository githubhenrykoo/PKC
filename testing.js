const API_KEY = 'AIzaSyBFnvQpbGWsaqlRddIeM0ZAhzwmbhE4oFk';
const q = "mimeType='application/vnd.google-apps.presentation' and (visibility='anyoneWithLink' or visibility='anyoneCanFind')";
const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&key=${API_KEY}`;

async function listPublicSlides() {
  const res = await fetch(listUrl);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.files || [];
}

async function getSlides(presentationId) {
  const url = `https://slides.googleapis.com/v1/presentations/${presentationId}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

(async () => {
  const files = await listPublicSlides();
  for (const f of files) {
    console.log('Found:', f.name, f.id, f.webViewLink);
    const slides = await getSlides(f.id);
    console.log('Title:', slides.title, 'Slides count:', slides.slides.length);
    // proses slides sesuai kebutuhan...
  }
})();
