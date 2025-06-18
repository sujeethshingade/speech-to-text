# Speech-to-Text Chatbot

A modern speech-to-text chatbot application built with Next.js frontend and Flask backend, powered by OpenAI's Whisper model for accurate speech recognition.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/sujeethshingade/speech-to-text.git
cd speech-to-text
```

### 2. Set up Virtual Environment

#### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

#### macOS/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Running the Application

```bash
npm install
npm run dev
```

### OpenAI Whisper Model

The application uses the "tiny" Whisper model by default for faster processing. You can change this in `api/index.py`:

```python
# Options: tiny, base, small, medium, large, turbo
model = whisper.load_model("tiny")
```

For more details about the different model sizes and their performance characteristics, view [Whisper Model Card](https://github.com/openai/whisper/blob/main/model-card.md).

## References

- [OpenAI Whisper](https://openai.com/index/whisper/)
- [Whisper GitHub Repository](https://github.com/openai/whisper)
- [Whisper Research Paper](https://cdn.openai.com/papers/whisper.pdf)
- [OpenAI Speech-to-Text Documentation](https://platform.openai.com/docs/guides/speech-to-text)
