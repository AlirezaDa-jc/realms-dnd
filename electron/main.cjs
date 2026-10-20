const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
};

let localServer;
const PORT = 4173;

function startLocalServer() {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
            reject(new Error(`Web export not found: ${path.join(DIST_DIR, 'index.html')}. Run "npx expo export --platform web" first.`));
            return;
        }

        const server = http.createServer((req, res) => {
            const pathname = new URL(req.url, 'http://127.0.0.1').pathname;

            let decodedPath;
            try {
                decodedPath = decodeURIComponent(pathname);
            } catch {
                res.writeHead(400);
                res.end('Bad request');
                return;
            }

            const relativePath = decodedPath.replace(/^\/+/, '');
            let filePath = path.resolve(DIST_DIR, relativePath || 'index.html');

            if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + path.sep)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
                // Client-side routes can fall back to the app entry point.
                // Missing asset files should return 404 instead of HTML.
                if (path.extname(filePath)) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }

                filePath = path.join(DIST_DIR, 'index.html');
            }

            const contentType =
                MIME_TYPES[path.extname(filePath).toLowerCase()] ??
                'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'X-Content-Type-Options': 'nosniff',
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
            });

            fs.createReadStream(filePath).pipe(res);
        });

        server.once('error', reject);

        server.listen(PORT, '127.0.0.1', () => {
            localServer = server;

            localServer = server;
            const address = server.address();

            if (!address || typeof address === 'string') {
                reject(new Error('Could not determine the local server address.'));
                return;
            }

            resolve(`http://127.0.0.1:${PORT}`);
        });
    });
}

async function createWindow(baseUrl) {
    const win = new BrowserWindow({
        width: 600,
        height: 1200,
        minWidth: 600,
        minHeight: 800,
        title: 'Realms',
        backgroundColor: '#101116',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    await win.loadURL(baseUrl);
}

app.whenReady().then(async () => {
    try {
        const baseUrl = await startLocalServer();
        await createWindow(baseUrl);

        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await createWindow(baseUrl);
            }
        });
    } catch (error) {
        console.error('Failed to start Realms:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    localServer?.close();
});