class P2PAudioCall {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isCaller = false;
        
        this.debug('Инициализация P2P аудио звонка...');
    }

    debug(message) {
        const debugDiv = document.getElementById('debug');
        debugDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
        console.log(message);
    }

    updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }

    async createCall() {
        try {
            this.debug('Создание звонка...');
            this.updateStatus('Получаем доступ к микрофону...', 'calling');
            
            // Получаем доступ к микрофону
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            this.debug('✅ Микрофон доступен');
            this.updateStatus('Создаем P2P соединение...', 'calling');
            
            // Создаем PeerConnection
            await this.createPeerConnection();
            
            // Создаем офер
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.debug('✅ Offer создан');
            this.updateStatus('Отправьте этот код собеседнику:', 'calling');
            
            // Показываем офер для копирования
            const offerString = JSON.stringify(offer);
            document.getElementById('offerInput').value = offerString;
            
            this.isCaller = true;
            document.getElementById('setup').style.display = 'none';
            document.getElementById('callControls').style.display = 'block';
            
            this.debug('Ожидаем ответ от собеседника...');
            
        } catch (error) {
            this.debug(`❌ Ошибка: ${error}`);
            this.updateStatus('Ошибка создания звонка', 'disconnected');
        }
    }

    async acceptCall() {
        try {
            const offerString = document.getElementById('offerInput').value;
            if (!offerString) {
                alert('Введите offer от собеседника');
                return;
            }

            this.debug('Принимаем звонок...');
            this.updateStatus('Подключаемся...', 'calling');
            
            // Получаем доступ к микрофону
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            this.debug('✅ Микрофон доступен');
            
            // Создаем PeerConnection
            await this.createPeerConnection();
            
            // Устанавливаем удаленный офер
            const offer = JSON.parse(offerString);
            await this.peerConnection.setRemoteDescription(offer);
            
            // Создаем ответ
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.debug('✅ Answer создан');
            this.updateStatus('Отправьте этот код обратно:', 'calling');
            
            // Показываем answer для копирования
            document.getElementById('offerInput').value = JSON.stringify(answer);
            
            this.isCaller = false;
            document.getElementById('setup').style.display = 'none';
            document.getElementById('callControls').style.display = 'block';
            
        } catch (error) {
            this.debug(`❌ Ошибка: ${error}`);
            this.updateStatus('Ошибка подключения', 'disconnected');
        }
    }

    async createPeerConnection() {
        // Конфигурация STUN серверов
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Добавляем локальные треки
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Обрабатываем удаленные треки
        this.peerConnection.ontrack = (event) => {
            this.debug('✅ Получен удаленный аудио поток');
            this.remoteStream = event.streams[0];
            this.setupRemoteAudio();
        };

        // Обрабатываем ICE кандидаты
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.debug('Новый ICE кандидат');
            }
        };

        // Отслеживаем состояние соединения
        this.peerConnection.onconnectionstatechange = () => {
            this.debug(`Состояние соединения: ${this.peerConnection.connectionState}`);
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    this.updateStatus('✅ Соединение установлено! Говорите!', 'connected');
                    this.debug('🎉 P2P аудио звонок активен!');
                    break;
                case 'disconnected':
                    this.updateStatus('❌ Соединение разорвано', 'disconnected');
                    break;
                case 'failed':
                    this.updateStatus('❌ Ошибка соединения', 'disconnected');
                    break;
            }
        };

        this.debug('✅ PeerConnection создан');
    }

    setupRemoteAudio() {
        if (!this.remoteStream) {
            this.debug('❌ Нет удаленного потока');
            return;
        }

        // Создаем аудио элемент для удаленного звука
        const remoteAudio = new Audio();
        remoteAudio.srcObject = this.remoteStream;
        remoteAudio.autoplay = true;
        
        // Пытаемся воспроизвести
        remoteAudio.play().then(() => {
            this.debug('✅ Удаленный звук воспроизводится');
        }).catch(error => {
            this.debug(`❌ Ошибка воспроизведения: ${error}`);
        });

        // Добавляем в DOM (скрыто)
        remoteAudio.style.display = 'none';
        document.body.appendChild(remoteAudio);
    }

    startAudio() {
        this.debug('🔊 Звук включен');
        // Звук уже включен через autoplay
    }

    endCall() {
        this.debug('Завершаем звонок...');
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        // Очищаем DOM
        document.querySelectorAll('audio').forEach(audio => audio.remove());
        
        this.updateStatus('Отключен', 'disconnected');
        document.getElementById('setup').style.display = 'block';
        document.getElementById('callControls').style.display = 'none';
        document.getElementById('offerInput').value = '';
        
        this.debug('📞 Звонок завершен');
    }
}

// Глобальные переменные
let p2pCall;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    p2pCall = new P2PAudioCall();
});

// Глобальные функции для кнопок
function createCall() {
    if (p2pCall) p2pCall.createCall();
}

function acceptCall() {
    if (p2pCall) p2pCall.acceptCall();
}

function startAudio() {
    if (p2pCall) p2pCall.startAudio();
}

function endCall() {
    if (p2pCall) p2pCall.endCall();
}
