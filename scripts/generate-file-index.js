import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILES_DIR = path.join(__dirname, '../public/Files');
const OUTPUT_FILE = path.join(__dirname, '../public/files.json');

function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];

    for (const item of items) {
        const itemPath = path.join(relativePath, item.name);
        if (item.isDirectory()) {
            result.push({
                name: item.name,
                type: 'directory',
                path: itemPath.replace(/\\/g, '/'),
                children: scanDirectory(path.join(dir, item.name), itemPath)
            });
        } else {
            // Only include relevant files if needed, but for now include all
            result.push({
                name: item.name,
                type: 'file',
                path: itemPath.replace(/\\/g, '/'),
                extension: path.extname(item.name).toLowerCase()
            });
        }
    }
    return result;
}

if (!fs.existsSync(FILES_DIR)) {
    console.log('Creating Files directory...');
    fs.mkdirSync(FILES_DIR, { recursive: true });
}

console.log('Scanning files...');
const fileTree = scanDirectory(FILES_DIR);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fileTree, null, 2));
console.log(`File index generated at ${OUTPUT_FILE}`);
