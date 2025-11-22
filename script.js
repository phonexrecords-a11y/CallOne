// Функции диагностики
async function runAudioDiagnostics() {
    const results = document.getElementById('diagnosticResults');
    results.innerHTML = '<div>🔄 Запускаем диагностику...</div>';
    
    const checks = [
        { name: 'WebRTC поддержка', check: checkWebRTCSupport },
        { name: 'Микрофон', check: checkMicrophoneAccess },
        { name: 'Аудио выход', check: checkAudioOutput },
        { name: 'Авто-воспроизведение', check: checkAutoplay }
    ];
    
    for (const check of checks) {
        try {
            const result = await check.check();
            results.innerHTML += `<div style="color: green;">✅ ${check.name}: ${result}</div>`;
        } catch (error) {
            results.innerHTML += `<div style="color: red;">❌ ${check.name}: ${error.message}</div>`;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

async function checkWebRTCSupport() {
    if (!window.RTCPeerConnection) throw new Error('Не поддерживается');
    return 'Поддерживается';
}

async function checkMicrophoneAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return 'Доступ разрешен';
    } catch (error) {
        throw new Error('Доступ запрещен: ' + error.message);
    }
}

async function checkAudioOutput() {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        audio.volume = 0.1;
        audio.oncanplay = () => resolve('Работает');
        audio.onerror = () => resolve('Возможны проблемы');
        audio.play().catch(() => resolve('Авто-воспроизведение ограничено'));
    });
}

async function checkAutoplay() {
    const audio = new Audio();
    audio.volume = 0;
    try {
        await audio.play();
        return 'Разрешено';
    } catch {
        return 'Ограничено (требуется действие пользователя)';
    }
}

async function testMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        
        const results = document.getElementById('diagnosticResults');
        results.innerHTML = '<div>🎤 Говорите в микрофон... Индикатор должен меняться:</div>';
        
        const checkVolume = () => {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const volume = Math.round((dataArray[0] / 255) * 100);
            results.innerHTML = `<div>🎤 Уровень звука: ${volume}% ${'█'.repeat(Math.floor(volume / 10))}</div>`;
            
            if (volume > 5) {
                setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop());
                    results.innerHTML += '<div style="color: green;">✅ Микрофон работает нормально</div>';
                }, 2000);
            } else {
                setTimeout(checkVolume, 100);
            }
        };
        
        checkVolume();
        
    } catch (error) {
        document.getElementById('diagnosticResults').innerHTML = 
            `<div style="color: red;">❌ Ошибка микрофона: ${error.message}</div>`;
    }
}

function testAudioPlayback() {
    const audio = new Audio();
    audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
    audio.volume = 0.1;
    
    audio.play().then(() => {
        document.getElementById('diagnosticResults').innerHTML = 
            '<div style="color: green;">✅ Воспроизведение звука работает</div>';
    }).catch(error => {
        document.getElementById('diagnosticResults').innerHTML = 
            `<div style="color: red;">❌ Ошибка воспроизведения: ${error.message}</div>`;
    });
}
