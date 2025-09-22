import { type MCardItem } from "@/services/MCardService";

interface ContentRendererProps {
  card: MCardItem;
  content: Blob | string;
  contentType: string;
}

export function ContentRenderer({ card, content, contentType }: ContentRendererProps) {
  if (content instanceof Blob) {
    const url = URL.createObjectURL(content);
    
    if (contentType.startsWith('image/')) {
      return `<div class="flex items-center justify-center w-full h-full overflow-auto">
        <img src="${url}" alt="Image preview" class="max-w-full object-contain" />
        <div class="absolute top-2 right-2">
          <a href="${url}" download="${card.hash}" class="inline-block bg-primary text-primary-foreground px-2 py-1 rounded text-sm">Download</a>
        </div>
      </div>`;
    } else if (contentType.startsWith('text/') || 
               contentType.includes('json') || 
               contentType.includes('xml') || 
               contentType.includes('yaml') ||
               contentType.includes('csv')) {
      return content.text().then(text => 
        `<div class="p-4 h-full overflow-auto">
          <div class="mb-2 flex justify-between items-center">
            <span class="text-sm text-muted-foreground">Content Type: ${contentType}</span>
            <a href="${url}" download="${card.hash}" class="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </a>
          </div>
          <pre class="whitespace-pre-wrap font-mono text-sm bg-muted p-3 rounded overflow-auto">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </div>`
      );
    } else if (contentType === 'application/pdf') {
      return `
        <iframe 
          src="${url}" 
          style="width: 100%; height: 100%; min-height: 600px; border: none;"
          title="PDF Preview"
        ></iframe>
        <div style="position: absolute; bottom: 10px; right: 10px;">
          <a 
            href="${url}" 
            download="${card.hash}.pdf"
            class="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </a>
        </div>
      `;
    } else if (contentType.startsWith('video/')) {
      return `<div class="flex items-center justify-center w-full h-full p-4">
        <div class="w-full max-w-4xl">
          <video controls class="w-full h-auto max-h-[70vh] rounded-lg">
            <source src="${url}" type="${contentType}">
            Your browser does not support the video tag.
          </video>
          <div class="mt-2 text-center">
            <a href="${url}" download="${card.hash}" class="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Video
            </a>
          </div>
        </div>
      </div>`;
    } else if (contentType.startsWith('audio/')) {
      return `<div class="flex items-center justify-center w-full h-full p-4">
        <div class="w-full max-w-2xl text-center">
          <div class="mb-4">
            <i class="fas fa-music text-6xl text-muted-foreground mb-4"></i>
            <p class="text-lg font-medium">Audio File</p>
            <p class="text-sm text-muted-foreground">${contentType}</p>
          </div>
          <audio controls class="w-full mb-4">
            <source src="${url}" type="${contentType}">
            Your browser does not support the audio element.
          </audio>
          <a href="${url}" download="${card.hash}" class="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-md">Download Audio</a>
        </div>
      </div>`;
    } else if (contentType.includes('zip') || 
               contentType.includes('rar') || 
               contentType.includes('tar') || 
               contentType.includes('gz')) {
      return `<div class="flex items-center justify-center w-full h-full p-4">
        <div class="text-center">
          <i class="fas fa-file-archive text-6xl text-muted-foreground mb-4"></i>
          <p class="text-lg font-medium mb-2">Archive File</p>
          <p class="text-sm text-muted-foreground mb-4">${contentType}</p>
          <p class="text-sm text-muted-foreground mb-4">Size: ${(content.size / 1024 / 1024).toFixed(2)} MB</p>
          <a href="${url}" download="${card.hash}" class="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md">Download Archive</a>
        </div>
      </div>`;
    } else {
      // Generic binary content
      const fileSize = (content.size / 1024 / 1024).toFixed(2);
      const isExecutable = contentType.includes('executable') || contentType.includes('application/');
      const iconClass = isExecutable ? 'fa-cog' : 'fa-file';
      
      return `<div class="flex items-center justify-center w-full h-full p-4">
        <div class="text-center">
          <i class="fas ${iconClass} text-6xl text-muted-foreground mb-4"></i>
          <p class="text-lg font-medium mb-2">Binary Content</p>
          <p class="text-sm text-muted-foreground mb-2">${contentType}</p>
          <p class="text-sm text-muted-foreground mb-4">Size: ${fileSize} MB</p>
          <p class="text-xs text-muted-foreground mb-4 max-w-md">This file type cannot be previewed directly. Click download to view it with an appropriate application.</p>
          <a href="${url}" download="${card.hash}" class="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md">Download File</a>
        </div>
      </div>`;
    }
  } else if (typeof content === 'string') {
    // Handle string content (likely text)
    return `<div class="p-4 h-full overflow-auto">
      <div class="mb-2">
        <span class="text-sm text-muted-foreground">Text Content</span>
      </div>
      <pre class="whitespace-pre-wrap font-mono text-sm bg-muted p-3 rounded overflow-auto">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
    </div>`;
  }
  
  return 'Unable to preview this content type';
}
