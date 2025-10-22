/**
 * Audio Service for Real-time PCM Audio Capture
 * Uses Web Audio API to capture raw PCM data for AssemblyAI transcription
 */

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Modern AudioWorklet-based PCM capture (preferred)
 */
class ModernAudioService {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.mediaStreamSource = null;
    this.isCapturing = false;
    this.onAudioData = null;
  }

  async initialize(stream, onAudioDataCallback) {
    try {
      // Create AudioContext with 16kHz sample rate (AssemblyAI requirement)
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.onAudioData = onAudioDataCallback;

      // Load the PCM processor worklet
      await this.audioContext.audioWorklet.addModule('/pcm-processor.js');

      // Create media stream source
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

      // Create PCM processor worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');

      // Listen for PCM data from worklet
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'pcm-data' && this.isCapturing) {
          const base64Audio = arrayBufferToBase64(event.data.data);
          this.onAudioData(base64Audio);
        }
      };

      // Connect audio nodes
      this.mediaStreamSource.connect(this.workletNode);
      
      console.log('✅ [AudioService] Modern Web Audio API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [AudioService] Failed to initialize modern audio service:', error);
      return false;
    }
  }

  startCapture() {
    this.isCapturing = true;
    console.log('🎙️ [AudioService] Started PCM audio capture');
  }

  stopCapture() {
    this.isCapturing = false;
    console.log('🛑 [AudioService] Stopped PCM audio capture');
  }

  cleanup() {
    this.stopCapture();
    
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('🧹 [AudioService] Cleaned up audio resources');
  }
}

/**
 * Fallback ScriptProcessor-based PCM capture (for older browsers)
 */
class LegacyAudioService {
  constructor() {
    this.audioContext = null;
    this.scriptProcessor = null;
    this.mediaStreamSource = null;
    this.isCapturing = false;
    this.onAudioData = null;
  }

  async initialize(stream, onAudioDataCallback) {
    try {
      // Create AudioContext with 16kHz sample rate
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.onAudioData = onAudioDataCallback;

      // Create media stream source
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

      // Create script processor (legacy but widely supported)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Process audio data
      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isCapturing) return;

        const inputBuffer = e.inputBuffer;
        const audioData = inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM S16LE)
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          // Clamp to [-1, 1] and convert to 16-bit signed integer
          const sample = Math.max(-1, Math.min(1, audioData[i]));
          pcmData[i] = Math.floor(sample * 32767);
        }
        
        // Convert to base64 and send
        const base64Audio = arrayBufferToBase64(pcmData.buffer);
        this.onAudioData(base64Audio);
      };

      // Connect audio nodes
      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      console.log('✅ [AudioService] Legacy Web Audio API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [AudioService] Failed to initialize legacy audio service:', error);
      return false;
    }
  }

  startCapture() {
    this.isCapturing = true;
    console.log('🎙️ [AudioService] Started PCM audio capture (legacy)');
  }

  stopCapture() {
    this.isCapturing = false;
    console.log('🛑 [AudioService] Stopped PCM audio capture (legacy)');
  }

  cleanup() {
    this.stopCapture();
    
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('🧹 [AudioService] Cleaned up audio resources (legacy)');
  }
}

/**
 * Main Audio Service with automatic fallback
 */
export class AudioService {
  constructor() {
    this.service = null;
    this.isModern = false;
  }

  async initialize(stream, onAudioDataCallback) {
    // Try modern AudioWorklet first
    const modernService = new ModernAudioService();
    const modernSuccess = await modernService.initialize(stream, onAudioDataCallback);
    
    if (modernSuccess) {
      this.service = modernService;
      this.isModern = true;
      console.log('🚀 [AudioService] Using modern AudioWorklet implementation');
      return true;
    }

    // Fallback to legacy ScriptProcessor
    console.log('⚠️ [AudioService] AudioWorklet not supported, falling back to ScriptProcessor');
    const legacyService = new LegacyAudioService();
    const legacySuccess = await legacyService.initialize(stream, onAudioDataCallback);
    
    if (legacySuccess) {
      this.service = legacyService;
      this.isModern = false;
      console.log('✅ [AudioService] Using legacy ScriptProcessor implementation');
      return true;
    }

    console.error('❌ [AudioService] Both modern and legacy implementations failed');
    return false;
  }

  startCapture() {
    if (this.service) {
      this.service.startCapture();
    }
  }

  stopCapture() {
    if (this.service) {
      this.service.stopCapture();
    }
  }

  cleanup() {
    if (this.service) {
      this.service.cleanup();
      this.service = null;
    }
  }

  getImplementationType() {
    return this.isModern ? 'AudioWorklet' : 'ScriptProcessor';
  }
}

export default AudioService;