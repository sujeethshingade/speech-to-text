let isRecording = false;
let isTranscribing = false;
let mediaRecorder = null;
let audioChunks = [];
let selectedModel = "gpt-4o-mini-transcribe";
let messageId = 0;

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const recordBtn = document.getElementById("recordBtn");
const sendBtn = document.getElementById("sendBtn");
const recordingIndicator = document.getElementById("recordingIndicator");
const tabs = document.querySelectorAll(".tab");

document.addEventListener("DOMContentLoaded", function () {
  messageInput.addEventListener("keydown", handleKeyDown);
  sendBtn.addEventListener("click", sendTextMessage);
  recordBtn.addEventListener("click", toggleRecording);

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => selectModel(tab.dataset.model));
  });

  checkBrowserSupport();
});

function addMessage(text, isUser = false, type = "text") {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user" : "bot"}`;
  messageDiv.innerHTML = `
        <div class="message-bubble">
            ${text}
        </div>
    `;

  messages.appendChild(messageDiv);
  messages.scrollTop = messages.scrollHeight;

  return messageDiv;
}

function sendTextMessage() {
  const text = messageInput.value.trim();
  if (!text || isTranscribing) return;

  addMessage(text, true);
  messageInput.value = "";
  
  // No bot response for text messages
}

function handleKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
}

function selectModel(model) {
  selectedModel = model;
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.model === model);
  });
}

async function transcribeFile(file) {
  if (isTranscribing) return;

  setTranscribing(true);

  const formData = new FormData();
  formData.append("audio", file);

  try {
    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      // Only put transcribed text in input box, don't add as message
      messageInput.value = data.text;
      messageInput.focus();
    } else {
      addMessage(`Error: ${data.error}`, false);
    }
  } catch (error) {
    addMessage(`Error: ${error.message}`, false);
  } finally {
    setTranscribing(false);
  }
}

async function toggleRecording() {
  if (isTranscribing) return;

  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    let options = { mimeType: "audio/webm" };
    if (!MediaRecorder.isTypeSupported("audio/webm")) {
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      } else {
        options = {};
      }
    }

    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const audioFile = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
      });

      stream.getTracks().forEach((track) => track.stop());
      await transcribeFile(audioFile);
    };

    mediaRecorder.start();
    setRecording(true);  } catch (error) {
    console.error("Recording error:", error);
    addMessage(
      "Could not access microphone. Please check permissions.",
      false
    );
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    setRecording(false);
  }
}

function setRecording(recording) {
  isRecording = recording;
  recordBtn.classList.toggle("recording", recording);
  recordBtn.innerHTML = recording ? "⏸️" : "�️";
  recordingIndicator.classList.toggle("active", recording);

  if (recording) {
    messageInput.placeholder = "Recording... Click mic to stop";
  } else {
    messageInput.placeholder = "Type a message or record audio...";
  }
}

function setTranscribing(transcribing) {
  isTranscribing = transcribing;
  recordBtn.disabled = transcribing;
  sendBtn.disabled = transcribing;
  messageInput.disabled = transcribing;

  if (transcribing) {
    messageInput.placeholder = `Processing with ${selectedModel}...`;
  } else if (!isRecording) {
    messageInput.placeholder = "Type a message or record audio...";
  }
}

function checkBrowserSupport() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    addMessage(
      "Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.",
      false
    );
    recordBtn.disabled = true;
  }

  if (!window.MediaRecorder) {
    addMessage(
      "MediaRecorder API not supported. Please update your browser.",
      false
    );
    recordBtn.disabled = true;
  }
}
