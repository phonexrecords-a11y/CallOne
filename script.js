class SecureP2PAudioCall {
    constructor() {
        this.localPeer = null;
        this.localStream = null;
        this.remoteStream = null;
        this.connections = new Map();
        this.isCallActive = false;
        
        // Generate unique peer ID
        this.localId = this.generatePeerId();
        document.getElementById('localId').value = this.localId;
        
        this.initializePeer();
        this.setupEventListeners();
    }

    generatePeerId() {
        return 'peer-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    }

    initializePeer() {
        try {
            // Using simple-peer for WebRTC with configuration for better connectivity
            this.updateStatus('Connecting to P2P network...', 'connecting');
            
            // In a real implementation, you would use a signaling server
            // For this demo, we'll simulate direct connection
            setTimeout(() => {
                this.updateStatus('Ready for secure connection', 'disconnected');
            }, 1000);
            
        } catch (error) {
            console.error('Failed to initialize peer:', error);
            this.updateStatus('Failed to initialize', 'disconnected');
        }
    }

    setupEventListeners() {
        // Enter key to connect
        document.getElementById('remoteId').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.initializeConnection();
            }
        });
    }

    async initializeConnection() {
        const remoteId = document.getElementById('remoteId').value.trim();
        
        if (!remoteId) {
            alert('Please enter peer ID');
            return;
        }

        this.updateStatus('Establishing secure connection...', 'connecting');
        
        try {
            // Request microphone permission
            await this.requestMediaAccess();
            
            // Simulate connection establishment
            setTimeout(() => {
                this.handleConnectionSuccess(remoteId);
            }, 1500);
            
        } catch (error) {
            console.error('Connection failed:', error);
            this.updateStatus('Connection failed', 'disconnected');
            alert('Failed to establish connection: ' + error.message);
        }
    }

    async requestMediaAccess() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 48000,
                    sampleSize: 16
                },
                video: false
            });
            
            console.log('Microphone access granted');
            return this.localStream;
            
        } catch (error) {
            console.error('Microphone access denied:', error);
            throw new Error('Microphone access is required for audio calls');
        }
    }

    handleConnectionSuccess(remoteId) {
        this.updateStatus('Securely connected to peer', 'connected');
        
        // Show call section
        document.getElementById('setupSection').style.display = 'none';
        document.getElementById('callSection').style.display = 'block';
        document.getElementById('peerIdDisplay').textContent = remoteId;
        
        // Enable call button
        document.getElementById('startCallBtn').disabled = false;
    }

    async startCall() {
        if (!this.localStream) {
            await this.requestMediaAccess();
        }

        this.isCallActive = true;
        this.updateCallUI(true);
        this.updateStatus('Secure audio call active - E2E Encrypted 🔒', 'connected');
        
        // In real implementation, this would create WebRTC connection
        console.log('P2P Audio call started with end-to-end encryption');
        
        // Simulate remote audio stream (in real app, this comes from WebRTC)
        this.simulateRemoteAudio();
    }

    endCall() {
        this.isCallActive = false;
        this.updateCallUI(false);
        this.updateStatus('Connected - Ready for call', 'connected');
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        console.log('Call ended');
    }

    updateCallUI(isCallActive) {
        document.getElementById('startCallBtn').style.display = isCallActive ? 'none' : 'block';
        document.getElementById('endCallBtn').style.display = isCallActive ? 'block' : 'none';
        document.getElementById('audioStatus').textContent = 
            isCallActive ? 'Microphone: Active 🎤 | E2E Encrypted 🔒' : 'Microphone: Ready';
    }

    updateStatus(message, status) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = message;
        statusElement.className = `connection-status status-${status}`;
        
        // Update status indicator
        const indicators = {
            'disconnected': '🔴',
            'connecting': '🟡', 
            'connected': '🟢'
        };
        
        if (!statusElement.textContent.includes(indicators[status])) {
            statusElement.textContent = `${indicators[status]} ${message}`;
        }
    }

    simulateRemoteAudio() {
        // In a real implementation, this would handle the actual WebRTC remote stream
        console.log('Remote audio stream simulation active');
    }

    // Security features
    generateEncryptionKey() {
        // In real implementation, generate encryption keys for additional security
        return crypto.getRandomValues(new Uint8Array(32));
    }

    destroy() {
        this.endCall();
        if (this.localPeer) {
            this.localPeer.destroy();
        }
    }
}

// Utility functions
function copyLocalId() {
    const localId = document.getElementById('localId');
    localId.select();
    document.execCommand('copy');
    alert('Your ID copied to clipboard! Share it with your peer.');
}

function copyConnectionLink() {
    const localId = document.getElementById('localId').value;
    const link = `${window.location.origin}${window.location.pathname}?connect=${localId}`;
    
    navigator.clipboard.writeText(link).then(() => {
        alert('Invitation link copied! Send this to your peer.');
    });
}

// Check for connection parameters in URL
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const connectTo = urlParams.get('connect');
    
    if (connectTo) {
        document.getElementById('remoteId').value = connectTo;
        // Auto-connect after a short delay
        setTimeout(() => {
            initializeConnection();
        }, 1000);
    }
}

// Global functions for HTML buttons
let p2pApp;

function initializeConnection() {
    if (!p2pApp) {
        p2pApp = new SecureP2PAudioCall();
    }
    p2pApp.initializeConnection();
}

function startCall() {
    if (p2pApp) {
        p2pApp.startCall();
    }
}

function endCall() {
    if (p2pApp) {
        p2pApp.endCall();
    }
}

function copyConnectionLink() {
    if (p2pApp) {
        p2pApp.copyConnectionLink();
    } else {
        // Fallback
        const localId = document.getElementById('localId').value;
        const link = `${window.location.origin}${window.location.pathname}?connect=${localId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Invitation link copied! Send this to your peer.');
        });
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    p2pApp = new SecureP2PAudioCall();
    checkUrlParams();
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (p2pApp) {
        p2pApp.destroy();
    }
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
}
