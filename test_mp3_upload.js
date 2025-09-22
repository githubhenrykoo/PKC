/**
 * Test script to simulate MP3 upload using the exact same logic as PKC app
 */

const fs = require('fs');
const path = require('path');

// Simulate the MCardService upload logic
async function testMP3Upload() {
    const filePath = '/Users/Henrykoo/Documents/PKC/2025.7.28.MP3';
    
    console.log('=== MP3 Upload Test ===');
    console.log(`Testing file: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        console.error('❌ File not found:', filePath);
        return;
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    console.log(`📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📅 Last modified: ${stats.mtime}`);
    
    // Read file as buffer to simulate File object
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    try {
        // Create FormData equivalent (using form-data package simulation)
        const FormData = require('form-data');
        const form = new FormData();
        
        // Add file (simulating browser File object)
        form.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'audio/mpeg'
        });
        
        // Add metadata (exactly like PKC app does)
        const metadata = {
            filename: fileName,
            originalType: 'audio/mpeg',
            size: stats.size,
            lastModified: stats.mtime.getTime()
        };
        
        form.append('metadata', JSON.stringify(metadata));
        
        console.log('📤 Uploading to MCard API...');
        console.log(`🎯 URL: https://devmcard.pkc.pub/v1/files`);
        console.log(`📦 Metadata:`, metadata);
        
        // Make the request using fetch (simulating browser behavior)
        const fetch = require('node-fetch');
        
        const response = await fetch('https://devmcard.pkc.pub/v1/files', {
            method: 'POST',
            body: form,
            headers: {
                ...form.getHeaders(),
                'Origin': 'http://localhost:4321'
            }
        });
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Upload successful!');
            console.log(`🔐 Hash: ${result.hash}`);
            console.log(`📄 Content type: ${result.content_type}`);
            console.log(`⏰ G-time: ${result.g_time}`);
        } else {
            const errorText = await response.text();
            console.log('❌ Upload failed!');
            console.log(`💥 Error: ${errorText}`);
            
            // Analyze the error
            if (response.status === 413) {
                console.log('');
                console.log('🔍 ANALYSIS:');
                console.log('This is an HTTP 413 "Request Entity Too Large" error.');
                console.log('The nginx proxy is rejecting the upload because the file exceeds');
                console.log('the configured client_max_body_size limit.');
                console.log('');
                console.log('💡 SOLUTION:');
                console.log('The server\'s nginx configuration needs to be updated:');
                console.log('client_max_body_size 50M;');
            }
        }
        
    } catch (error) {
        console.log('❌ Network error:', error.message);
        
        if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
            console.log('');
            console.log('🔍 ANALYSIS:');
            console.log('The connection was reset, likely due to the server');
            console.log('rejecting the upload before it completed.');
        }
    }
}

// Check if required packages are available
try {
    require('form-data');
    require('node-fetch');
    testMP3Upload();
} catch (error) {
    console.log('Installing required packages...');
    const { exec } = require('child_process');
    exec('npm install form-data node-fetch@2', (err) => {
        if (err) {
            console.error('Failed to install packages:', err);
            console.log('Please run: npm install form-data node-fetch@2');
        } else {
            console.log('Packages installed, running test...');
            testMP3Upload();
        }
    });
}
