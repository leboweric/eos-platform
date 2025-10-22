/**
 * AudioWorklet processor for real-time PCM conversion
 * Converts Float32 audio data to Int16 PCM format for AssemblyAI
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.bufferCount = 0;
    console.log('🎤 PCM AudioWorklet processor initialized');
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        // When buffer is full, convert to PCM and send
        if (this.bufferIndex >= this.bufferSize) {
          this.sendPCMData();
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep processor alive
  }
  
  sendPCMData() {
    // Convert Float32Array to Int16Array (PCM S16LE)
    const pcmData = new Int16Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      // Clamp and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, this.buffer[i]));
      pcmData[i] = Math.floor(sample * 32767);
    }
    
    // Send PCM data to main thread
    this.port.postMessage({
      type: 'pcm-data',
      data: pcmData.buffer
    });
    
    this.bufferCount++;
    // Optional: Log every 100 buffers (~1 second of audio)
    if (this.bufferCount % 100 === 0) {
      console.log(`📤 PCM buffers sent: ${this.bufferCount}`);
    }
  }
}

registerProcessor('pcm-processor', PCMProcessor);