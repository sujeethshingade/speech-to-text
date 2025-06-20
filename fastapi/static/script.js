let isRecording = false;
let isTranscribing = false;
let mediaRecorder = null;
let audioChunks = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Check for browser compatibility
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.', 'error');
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.disabled = true;
        recordBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    if (!window.MediaRecorder) {
        setStatus('MediaRecorder API not supported in your browser. Please use a modern browser.', 'error');
        const recordBtn = document.getElementById('recordBtn');
        recordBtn.disabled = true;
        recordBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    
    console.log('App initialized. MediaRecorder support:', !!window.MediaRecorder);
    console.log('getUserMedia support:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
});

function addMessage(text, isUser) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
    
    const messageBubble = document.createElement('div');
    messageBubble.className = `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-800'
    }`;
    messageBubble.textContent = text;
    
    messageDiv.appendChild(messageBubble);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || isTranscribing) return;
    
    addMessage(text, true);
    input.value = '';
    
    // Simulate bot response
    setTimeout(() => {
        addMessage(`Received your message: "${text}". This is a demo response.`, false);
    }, 1000);
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

async function toggleRecording() {
    if (isTranscribing) return;
    
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');
        
        // Choose the best supported audio format
        let options = { mimeType: 'audio/webm' };
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = { mimeType: 'audio/mp4' };
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                options = { mimeType: 'audio/ogg' };
            } else {
                options = {}; // Let browser choose default
            }
        }
        
        console.log('Using audio format:', options.mimeType || 'default');
        
        mediaRecorder = new MediaRecorder(stream, options);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            console.log('Audio data available:', event.data.size, 'bytes');
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            console.log('Recording stopped, total chunks:', audioChunks.length);
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log('Audio blob size:', audioBlob.size, 'bytes', 'type:', mimeType);
            await transcribeAudio(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        updateRecordingUI();
        console.log('Recording started');
        
    } catch (error) {
        console.error('Recording error:', error);
        if (error.name === 'NotAllowedError') {
            setStatus('Microphone access denied. Please allow microphone access and try again.', 'error');
        } else if (error.name === 'NotFoundError') {
            setStatus('No microphone found. Please connect a microphone and try again.', 'error');
        } else {
            setStatus('Could not access microphone. Please check permissions and try again.', 'error');
        }
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        updateRecordingUI();
    }
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const micIcon = document.getElementById('micIcon');
    const input = document.getElementById('messageInput');
    
    if (isRecording) {
        recordBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        recordBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-stop');
        input.placeholder = 'Recording... Click mic to stop';
        setStatus('Recording...', 'recording');    } else if (isTranscribing) {
        recordBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        recordBtn.classList.add('bg-gray-400');
        micIcon.classList.remove('fa-stop');
        micIcon.classList.add('fa-microphone');        input.placeholder = 'Processing with Whisper AI...';
    } else {
        recordBtn.classList.remove('bg-red-500', 'hover:bg-red-600', 'bg-gray-400');
        recordBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
        micIcon.classList.remove('fa-stop');
        micIcon.classList.add('fa-microphone');
        input.placeholder = 'Ask anything...';
        setStatus('', '');
    }
}

async function transcribeAudio(audioBlob) {
    isTranscribing = true;
    updateRecordingUI();
    
    try {
        console.log('Starting transcription for blob:', audioBlob.size, 'bytes', 'type:', audioBlob.type);
        
        // Check if blob has content
        if (audioBlob.size === 0) {
            throw new Error('No audio data recorded');
        }
        
        const formData = new FormData();
        
        // Determine file extension based on MIME type
        let filename = 'recording.webm'; // default
        if (audioBlob.type.includes('mp4')) {
            filename = 'recording.mp4';
        } else if (audioBlob.type.includes('ogg')) {
            filename = 'recording.ogg';
        } else if (audioBlob.type.includes('wav')) {
            filename = 'recording.wav';
        }
        
        formData.append('audio', audioBlob, filename);
        
        setStatus('Transcribing with Whisper AI (GPT-4o-mini compatible)...', 'processing');
        
        console.log('Sending transcription request...');
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Transcription response:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Transcription failed');
        }
        
        const text = data.text?.trim() || '';
        if (text) {
            addMessage(text, true);
            // Simulate bot response
            setTimeout(() => {
                addMessage(`Received your message: "${text}". This is a demo response.`, false);
            }, 1000);
        } else {
            setStatus('No speech detected in recording', 'error');
        }
        
        setStatus('Transcription completed', 'success');
        
    } catch (error) {
        console.error('Transcription error:', error);
        setStatus(`Transcription failed: ${error.message}`, 'error');
    } finally {
        isTranscribing = false;
        updateRecordingUI();
    }
}

function setStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    
    // Remove all status classes
    statusEl.classList.remove('text-green-600', 'text-red-600', 'text-blue-600', 'text-yellow-600');
    
    // Add appropriate class based on type
    switch (type) {
        case 'success':
            statusEl.classList.add('text-green-600');
            break;
        case 'error':
            statusEl.classList.add('text-red-600');
            break;
        case 'processing':
        case 'recording':
            statusEl.classList.add('text-blue-600');
            break;
        default:
            statusEl.classList.add('text-gray-600');
    }
    
    // Clear status after 3 seconds for non-error messages
    if (type !== 'error' && message) {
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = '';
            }
        }, 3000);
    }
}
