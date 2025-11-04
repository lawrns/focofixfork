// Web Worker for audio processing and transcription
self.addEventListener('message', async (event) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'PROCESS_AUDIO':
        await processAudioData(data)
        break
      case 'TRANSCRIBE_AUDIO':
        await transcribeAudio(data)
        break
      case 'EXTRACT_INTENT':
        await extractIntentFromText(data)
        break
      case 'GENERATE_PLAN':
        await generateProjectPlan(data)
        break
      case 'REDACT_PII':
        await redactPIIFromText(data)
        break
      case 'ENCRYPT_DATA':
        await encryptData(data)
        break
      case 'DECRYPT_DATA':
        await decryptData(data)
        break
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      originalType: type
    })
  }
})

async function processAudioData(audioData) {
  const { audioBuffer, sampleRate, options } = audioData
  
  // Audio processing in worker thread
  const processedData = {
    normalized: normalizeAudio(audioBuffer),
    filtered: applyNoiseFilter(audioBuffer, options?.noiseReduction || true),
    features: extractAudioFeatures(audioBuffer, sampleRate),
    duration: audioBuffer.duration
  }

  self.postMessage({
    type: 'AUDIO_PROCESSED',
    data: processedData
  })
}

async function transcribeAudio(audioData) {
  const { audioBuffer, language, options } = audioData
  
  // Simulate transcription processing
  const transcription = {
    text: await mockTranscription(audioBuffer, language),
    confidence: 0.95,
    language: language || 'en',
    duration: audioBuffer.duration,
    words: await extractWords(audioBuffer),
    alternatives: await generateAlternatives(audioBuffer, language),
    processingTime: Date.now() - audioData.startTime,
    metadata: {
      model: 'whisper-1',
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    }
  }

  self.postMessage({
    type: 'TRANSCRIPTION_COMPLETE',
    data: transcription
  })
}

async function extractIntentFromText(textData) {
  const { text, context, options } = textData
  
  // Intent extraction in worker
  const intent = {
    intent: detectIntent(text),
    confidence: calculateConfidence(text),
    entities: extractEntities(text),
    processingTime: Date.now() - textData.startTime,
    metadata: {
      textLength: text.length,
      wordCount: text.split(' ').length,
      language: detectLanguage(text)
    }
  }

  self.postMessage({
    type: 'INTENT_EXTRACTED',
    data: intent
  })
}

async function generateProjectPlan(planData) {
  const { intent, entities, context, options } = planData
  
  // Plan generation in worker
  const plan = {
    plan: await generatePlanFromIntent(intent, entities),
    confidence: calculatePlanConfidence(intent, entities),
    processingTime: Date.now() - planData.startTime,
    metadata: {
      intentType: intent.intent,
      entityCount: entities.length,
      complexity: calculateComplexity(entities)
    }
  }

  self.postMessage({
    type: 'PLAN_GENERATED',
    data: plan
  })
}

async function redactPIIFromText(textData) {
  const { text, options } = textData
  
  // PII redaction in worker
  const redaction = {
    originalText: text,
    redactedText: await redactPII(text, options),
    entities: await detectPIIEntities(text),
    statistics: {
      totalEntities: 0,
      entitiesByType: {},
      redactionPercentage: 0
    },
    processingTime: Date.now() - textData.startTime
  }

  // Calculate statistics
  redaction.statistics.totalEntities = redaction.entities.length
  redaction.entities.forEach(entity => {
    redaction.statistics.entitiesByType[entity.type] = 
      (redaction.statistics.entitiesByType[entity.type] || 0) + 1
  })
  redaction.statistics.redactionPercentage = 
    (redaction.entities.length / text.split(' ').length) * 100

  self.postMessage({
    type: 'PII_REDACTED',
    data: redaction
  })
}

async function encryptData(encryptionData) {
  const { data, keyId, options } = encryptionData
  
  // Encryption in worker
  const encrypted = {
    encryptedData: await performEncryption(data, keyId),
    iv: generateIV(),
    algorithm: 'aes-256-gcm',
    keyId: keyId,
    timestamp: new Date().toISOString(),
    processingTime: Date.now() - encryptionData.startTime,
    metadata: {
      originalSize: data.length,
      encryptedSize: 0,
      compressionUsed: options?.compress || false
    }
  }

  encrypted.metadata.encryptedSize = encrypted.encryptedData.length

  self.postMessage({
    type: 'DATA_ENCRYPTED',
    data: encrypted
  })
}

async function decryptData(decryptionData) {
  const { encryptedData, iv, keyId, algorithm } = decryptionData
  
  // Decryption in worker
  const decrypted = {
    decryptedData: await performDecryption(encryptedData, iv, keyId),
    algorithm: algorithm,
    keyId: keyId,
    processingTime: Date.now() - decryptionData.startTime,
    metadata: {
      encryptedSize: encryptedData.length,
      decryptedSize: 0,
      integrityVerified: true
    }
  }

  decrypted.metadata.decryptedSize = decrypted.decryptedData.length

  self.postMessage({
    type: 'DATA_DECRYPTED',
    data: decrypted
  })
}

// Helper functions (mocked for demonstration)
function normalizeAudio(audioBuffer) {
  // Mock audio normalization
  return new Float32Array(audioBuffer.length).fill(0.8)
}

function applyNoiseFilter(audioBuffer, enabled) {
  // Mock noise filtering
  return enabled ? new Float32Array(audioBuffer.length).fill(0.9) : audioBuffer
}

function extractAudioFeatures(audioBuffer, sampleRate) {
  // Mock feature extraction
  return {
    mfcc: new Array(13).fill(0).map(() => Math.random()),
    spectralCentroid: Math.random() * 8000,
    zeroCrossingRate: Math.random() * 0.1,
    rms: Math.random() * 0.5
  }
}

async function mockTranscription(audioBuffer, language) {
  // Mock transcription - in real implementation would call Whisper API
  await new Promise(resolve => setTimeout(resolve, 1000))
  return "This is a mock transcription of the audio content"
}

async function extractWords(audioBuffer) {
  // Mock word extraction
  return [
    { word: 'This', start: 0.0, end: 0.2, confidence: 0.95 },
    { word: 'is', start: 0.3, end: 0.4, confidence: 0.98 },
    { word: 'a', start: 0.5, end: 0.6, confidence: 0.92 },
    { word: 'mock', start: 0.7, end: 0.9, confidence: 0.96 }
  ]
}

async function generateAlternatives(audioBuffer, language) {
  // Mock alternative transcriptions
  return [
    { text: 'This is a mock transcription', confidence: 0.90 },
    { text: 'This is a mock transcription of audio', confidence: 0.85 }
  ]
}

function detectIntent(text) {
  // Mock intent detection
  if (text.includes('create') || text.includes('make') || text.includes('build')) {
    return 'create_plan'
  } else if (text.includes('update') || text.includes('modify') || text.includes('change')) {
    return 'update_task'
  } else if (text.includes('delete') || text.includes('remove')) {
    return 'delete_task'
  } else {
    return 'unknown'
  }
}

function calculateConfidence(text) {
  // Mock confidence calculation
  const words = text.split(' ')
  const clarity = words.length > 5 ? 0.9 : 0.7
  const specificTerms = ['create', 'task', 'project', 'update'].some(term => 
    text.toLowerCase().includes(term)
  )
  return specificTerms ? clarity : clarity * 0.6
}

function extractEntities(text) {
  // Mock entity extraction
  const entities = []
  
  // Extract project types
  if (text.includes('mobile app')) {
    entities.push({ type: 'project_type', value: 'mobile app', confidence: 0.9 })
  }
  
  // Extract priorities
  if (text.includes('high priority')) {
    entities.push({ type: 'priority', value: 'high', confidence: 0.95 })
  }
  
  // Extract assignees
  const nameMatch = text.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/)
  if (nameMatch) {
    entities.push({ type: 'assignee', value: nameMatch[1], confidence: 0.8 })
  }
  
  return entities
}

function detectLanguage(text) {
  // Mock language detection
  return text.match(/[a-zA-Z]/) ? 'en' : 'unknown'
}

async function generatePlanFromIntent(intent, entities) {
  // Mock plan generation
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    title: 'Generated Project Plan',
    description: 'Plan generated from voice input',
    milestones: [
      {
        id: 'milestone-1',
        title: 'Initial Phase',
        description: 'First phase of the project',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          {
            id: 'task-1',
            title: 'Setup project',
            description: 'Initial project setup',
            estimatedDuration: 5,
            priority: entities.find(e => e.type === 'priority')?.value || 'medium'
          }
        ]
      }
    ]
  }
}

function calculatePlanConfidence(intent, entities) {
  // Mock confidence calculation
  const baseConfidence = intent.confidence || 0.7
  const entityBonus = entities.length * 0.05
  return Math.min(0.95, baseConfidence + entityBonus)
}

function calculateComplexity(entities) {
  // Mock complexity calculation
  return entities.length > 3 ? 'high' : entities.length > 1 ? 'medium' : 'low'
}

async function redactPII(text, options) {
  // Mock PII redaction
  let redacted = text
  
  // Redact emails
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
  
  // Redact phone numbers
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
  
  // Redact SSN
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
  
  return redacted
}

async function detectPIIEntities(text) {
  // Mock PII detection
  const entities = []
  
  // Detect emails
  const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
  if (emailMatches) {
    emailMatches.forEach(email => {
      entities.push({ type: 'email', value: email, confidence: 0.95 })
    })
  }
  
  // Detect phone numbers
  const phoneMatches = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g)
  if (phoneMatches) {
    phoneMatches.forEach(phone => {
      entities.push({ type: 'phone', value: phone, confidence: 0.9 })
    })
  }
  
  return entities
}

function generateIV() {
  // Generate random IV
  return Array.from({length: 16}, () => Math.floor(Math.random() * 256))
}

async function performEncryption(data, keyId) {
  // Mock encryption
  await new Promise(resolve => setTimeout(resolve, 100))
  return new Uint8Array(data.length).fill(42) // Mock encrypted data
}

async function performDecryption(encryptedData, iv, keyId) {
  // Mock decryption
  await new Promise(resolve => setTimeout(resolve, 100))
  return "Mock decrypted data"
}
