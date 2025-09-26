const fs = require('fs');
const readline = require('readline');
const { execSync } = require('child_process');

// File yang akan direwrite
const filePath = 'pidato.txt';

// Baca konten file
let content = fs.readFileSync(filePath, 'utf8');

// Inisialisasi readline untuk instruksi interaktif
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Masukkan instruksi rewrite (misal: formal, inspiratif, vibe coding): ', (instruction) => {

    // Regex untuk menemukan teks antara marker
    const regex = /\/\/ AI_REWRITE_START\n([\s\S]*?)\n\/\/ AI_REWRITE_END/g;

    content = content.replace(regex, (_, matchedText) => {
        // Buat prompt untuk Ollama
        const prompt = `You are a text rewriter. Rewrite the text to be ${instruction} while keeping the original meaning: "${matchedText}"`;

        try {
            // Jalankan Ollama CLI
            const rewritten = execSync(`ollama run llama3 "${prompt.replace(/"/g,'\\"')}"`).toString();
            return `// AI_REWRITE_START\n${rewritten.trim()}\n// AI_REWRITE_END`;
        } catch (err) {
            console.error('Error saat memanggil Ollama CLI:', err);
            return matchedText; // fallback ke teks asli
        }
    });

    // Tulis kembali ke file
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('File berhasil direwrite sesuai instruksi!');

    rl.close();
});
