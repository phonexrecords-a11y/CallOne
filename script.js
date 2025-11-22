class P2PAudioCall {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isCaller = false;
        this.remoteAudio = null;
        
        this.debug('🚀 Инициализация P2P аудио звонка...');
        this.initializeEventListeners();
        this.checkWebRTCSupport();
    }

    initializeEventListeners() {
        // Кнопки
        document.getElementById('createCallBtn').addEventListener('click', () => this.createCall());
        document.getElementById('copyOfferBtn').addEventListener('click', () => this.copyOffer());
        document.getElementById('copyAnswerBtn').addEventListener('click', () => this.copyAnswer());
        document.getElementById('processInputBtn').addEventListener('click', () => this.processDirectInput());
        document.getElementById('startAudioBtn').addEventListener('click', () => this.startAudio());
        document.getElementById('endCallBtn').addEventListener('click', () => this.endCall());
        document.getElementById('testMicBtn').addEventListener('click', () => this.testLocalAudio());
        document.getElementById('testSpeakerBtn').addEventListener('click', () => this.testRemoteAudio());
        
        // Тестовые кнопки
        document.getElementById('simulateAnswerBtn').addEventListener('click', () => this.simulateReceivedAnswer());
        document.getElementById('simulateAcceptBtn').addEventListener('click', () => this.simulateAcceptCall());
        
        // Enter в поле ввода
        document.getElementById('directInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processDirectInput();
        });
    }

    checkWebRTCSupport() {
        if (!window.RTCPeerConnection) {
            this.debug('❌ WebRTC не поддерживается в этом браузере');
            alert('WebRTC не поддерживается! Используйте Chrome, Firefox или Safari.');
            return false;
        }
        this.debug('✅ WebRTC поддерживается');
        return true;
    }

    debug(message) {
        const debugDiv = document.getElementById('debug');
        const timestamp = new Date().toLocaleTimeString();
        debugDiv.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        debugDiv.scrollTop = debugDiv.scrollHeight;
        console.log(message);
    }

    updateStatus(message, type) {
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status ${type}`;
        }
    }

    showStep(stepNumber) {
        // Скрываем все шаги
        for (let i = 1; i <= 3; i++) {
            const step = document.getElementById(`step${i}`);
            if (step) step.classList.add('hidden');
        }
        
        // Скрываем controls
        const controls = document.getElementById('callControls');
        if (controls) controls.classList.add('hidden');
        
        // Показываем нужный шаг
        if (stepNumber) {
            const step = document.getElementById(`step${stepNumber}`);
            if (step) step.classList.remove('hidden');
        }
    }

    async createCall() {
        try {
            if (!this.checkWebRTCSupport()) return;

            this.debug('📞 Создание звонка...');
            this.updateStatus('Получаем доступ к микрофону...', 'calling');

            // Получаем доступ к микрофону
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 48000
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

            // Ждем немного чтобы ICE кандидаты собрались
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.debug('✅ Offer создан');
            this.updateStatus('Скопируйте код и отправьте собеседнику', 'calling');

            // Показываем офер для копирования
            const offerData = {
                type: 'offer',
                sdp: this.peerConnection.localDescription.sdp,
                caller: true
            };

            const offerString = JSON.stringify(offerData, null, 2);
            const offerCode = document.getElementById('offerCode');
            if (offerCode) {
                offerCode.textContent = offerString;
            }
            
            this.isCaller = true;
            this.showStep(2);

            this.debug('⏳ Ожидаем ответ от собеседника...');

        } catch (error) {
            this.debug(`❌ Ошибка создания звонка: ${error.message}`);
            this.updateStatus('Ошибка создания звонка', 'disconnected');
            alert(`Ошибка: ${error.message}`);
        }
    }

    async acceptCall(offerString) {
        try {
            if (!this.checkWebRTCSupport()) return;

            this.debug('✅ Принимаем звонок...');
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

            // Парсим офер
            const offerData = JSON.parse(offerString);
            if (offerData.type !== 'offer') {
                throw new Error('Это не offer');
            }

            // Создаем PeerConnection
            await this.createPeerConnection();

            // Устанавливаем удаленный офер
            await this.peerConnection.setRemoteDescription(offerData);

            // Создаем ответ
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Ждем ICE кандидатов
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.debug('✅ Answer создан');
            this.updateStatus('Скопируйте ответ и отправьте обратно', 'calling');

            // Показываем answer для копирования
            const answerData = {
                type: 'answer', 
                sdp: this.peerConnection.localDescription.sdp,
                caller: false
            };

            const answerString = JSON.stringify(answerData, null, 2);
            const answerCode = document.getElementById('answerCode');
            if (answerCode) {
                answerCode.textContent = answerString;
            }
            
            this.isCaller = false;
            this.showStep(3);

        } catch (error) {
            this.debug(`❌ Ошибка принятия звонка: ${error.message}`);
            this.updateStatus('Ошибка подключения', 'disconnected');
            alert(`Ошибка: ${error.message}`);
        }
    }

    async processAnswer(answerString) {
        try {
            this.debug('🔗 Обрабатываем answer...');

            const answerData = JSON.parse(answerString);
            if (answerData.type !== 'answer') {
                throw new Error('Это не answer');
            }

            await this.peerConnection.setRemoteDescription(answerData);
            this.debug('✅ Answer установлен');

            this.showStep(null);
            const controls = document.getElementById('callControls');
            if (controls) {
                controls.classList.remove('hidden');
            }

        } catch (error) {
            this.debug(`❌ Ошибка обработки answer: ${error.message}`);
            alert(`Ошибка: ${error.message}`);
        }
    }

    async createPeerConnection() {
        // Конфигурация STUN серверов
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };

        this.peerConnection = new RTCPeerConnection(configuration);
        
        // Добавляем локальные треки
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
            this.debug(`✅ Добавлен трек: ${track.kind}`);
        });

        // Обрабатываем удаленные треки
        this.peerConnection.ontrack = (event) => {
            this.debug('🎉 Получен удаленный аудио поток!');
            this.remoteStream = event.streams[0];
            this.setupRemoteAudio();
        };

        // Обрабатываем ICE кандидаты
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.debug('📡 Новый ICE кандидат');
            } else {
                this.debug('✅ Все ICE кандидаты собраны');
            }
        };

        // Отслеживаем состояние соединения
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            this.debug(`🔗 Состояние соединения: ${state}`);
            
            switch (state) {
                case 'connected':
                    this.updateStatus('✅ Соединение установлено! Говорите!', 'connected');
                    this.debug('🎊 P2P аудио звонок активен!');
                    break;
                case 'disconnected':
                    this.updateStatus('⚠️ Соединение разорвано', 'disconnected');
                    break;
                case 'failed':
                    this.updateStatus('❌ Ошибка соединения', 'disconnected');
                    break;
                case 'connecting':
                    this.updateStatus('🔄 Подключаемся...', 'calling');
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
        this.remoteAudio = new Audio();
        this.remoteAudio.srcObject = this.remoteStream;
        this.remoteAudio.autoplay = true;
        this.remoteAudio.volume = 1.0;
        
        // Пытаемся воспроизвести
        this.remoteAudio.play().then(() => {
            this.debug('🔊 Удаленный звук воспроизводится');
        }).catch(error => {
            this.debug(`❌ Ошибка воспроизведения: ${error.message}`);
        });

        // Добавляем в DOM (скрыто)
        this.remoteAudio.style.display = 'none';
        document.body.appendChild(this.remoteAudio);
    }

    async copyOffer() {
        const offerCode = document.getElementById('offerCode');
        if (!offerCode) return;
        
        const text = offerCode.textContent;
        if (!text || text === 'Здесь появится код...') {
            alert('Сначала создайте звонок!');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.debug('📋 Offer скопирован в буфер обмена');
            alert('Код скопирован! Отправьте его собеседнику.');
        } catch (error) {
            this.debug('❌ Ошибка копирования: ' + error.message);
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.debug('📋 Offer скопирован (fallback)');
            alert('Код скопирован! Отправьте его собеседнику.');
        }
    }

    async copyAnswer() {
        const answerCode = document.getElementById('answerCode');
        if (!answerCode) return;
        
        const text = answerCode.textContent;
        if (!text || text === 'Здесь появится ответ...') {
            alert('Сначала примите звонок!');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.debug('📋 Answer скопирован в буфер обмена');
            alert('Ответ скопирован! Отправьте его обратно звонящему.');
        } catch (error) {
            this.debug('❌ Ошибка копирования: ' + error.message);
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.debug('📋 Answer скопирован (fallback)');
            alert('Ответ скопирован! Отправьте его обратно звонящему.');
        }
    }

    processDirectInput() {
        const input = document.getElementById('directInput');
        if (!input) return;
        
        const inputText = input.value.trim();
        if (!inputText) {
            alert('Введите код офера или ответа');
            return;
        }

        try {
            const data = JSON.parse(inputText);
            
            if (data.type === 'offer' && !this.isCaller) {
                this.acceptCall(inputText);
            } else if (data.type === 'answer' && this.isCaller) {
                this.processAnswer(inputText);
            } else {
                alert('Неверный тип кода или состояние звонка');
            }
        } catch (error) {
            alert('Неверный формат кода: ' + error.message);
        }
    }

    // Тестовые функции для демонстрации
    simulateReceivedAnswer() {
        const answerCode = document.getElementById('answerCode');
        if (!answerCode) return;
        
        const answerText = answerCode.textContent;
        if (answerText && answerText !== 'Здесь появится ответ...' && this.isCaller) {
            const input = document.getElementById('directInput');
            if (input) {
                input.value = answerText;
                this.debug('🧪 Тест: Answer вставлен в поле ввода');
                setTimeout(() => this.processDirectInput(), 1000);
            }
        } else {
            alert('Сначала создайте звонок и получите ответ!');
        }
    }

    simulateAcceptCall() {
        const offerCode = document.getElementById('offerCode');
        if (!offerCode) return;
        
        const offerText = offerCode.textContent;
        if (offerText && offerText !== 'Здесь появится код...' && !this.isCaller) {
            const input = document.getElementById('directInput');
            if (input) {
                input.value = offerText;
                this.debug('🧪 Тест: Offer вставлен в поле ввода');
                setTimeout(() => this.processDirectInput(), 1000);
            }
        } else {
            alert('Сначала примите звонок!');
        }
    }

    startAudio() {
        this.debug('🔊 Звук включен');
        if (this.remoteAudio) {
            this.remoteAudio.volume = 1.0;
        }
    }

    async testLocalAudio() {
        try {
            if (!this.localStream) {
                alert('Сначала начните звонок!');
                return;
            }

            const testAudio = new Audio();
            testAudio.srcObject = this.localStream;
            testAudio.volume = 0.1;
            await testAudio.play();
            this.debug('🎵 Тест микрофона: ВАШ голос слышен в динамиках');
            setTimeout(() => {
                testAudio.pause();
                testAudio.srcObject = null;
            }, 3000);
        } catch (error) {
            this.debug(`❌ Ошибка теста микрофона: ${error.message}`);
        }
    }

    testRemoteAudio() {
        // Создаем тестовый звук
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        this.debug('🔊 Тест динамиков: Должен быть слышен тон 440Hz');
        
        setTimeout(() => {
            oscillator.stop();
            this.debug('✅ Тест динамиков завершен');
        }, 2000);
    }

    endCall() {
        this.debug('📞 Завершаем звонок...');
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.debug('✅ Локальный поток остановлен');
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.debug('✅ PeerConnection закрыт');
        }
        
        if (this.remoteAudio) {
            this.remoteAudio.pause();
            this.remoteAudio.srcObject = null;
            this.debug('✅ Удаленный аудио остановлен');
        }
        
        this.updateStatus('Отключен', 'disconnected');
        this.showStep(1);
        
        const controls = document.getElementById('callControls');
        if (controls) controls.classList.add('hidden');
        
        const input = document.getElementById('directInput');
        if (input) input.value = '';
        
        this.debug('📞 Звонок завершен');
        
        // Сбрасываем состояние
        this.isCaller = false;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.p2pCall = new P2PAudioCall();
});
