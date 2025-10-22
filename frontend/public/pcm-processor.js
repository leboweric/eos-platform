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
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // DEBUG: Log input availability (throttle to avoid spam)
    if (this.bufferIndex === 0) {
      console.log('🎤 [AudioWorklet] Process called:', {
        hasInput: input.length > 0,
        channelCount: input.length,
        firstChannelLength: input[0]?.length || 0,
        timestamp: new Date().toISOString()
      });
    }
    
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
    } else {
      // DEBUG: Log when no input is available
      if (this.bufferIndex === 0) {
        console.warn('⚠️ [AudioWorklet] No audio input available');
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
    
    // DEBUG: Log AudioWorklet sending data
    console.log('🔊 [AudioWorklet] Sending PCM data:', {
      bufferSize: this.bufferSize,
      dataSize: pcmData.buffer.byteLength,
      firstSample: pcmData[0],
      timestamp: new Date().toISOString()
    });
    
    // Send PCM data to main thread
    this.port.postMessage({
      type: 'pcm-data',
      data: pcmData.buffer
    });
  }
}

registerProcessor('pcm-processor', PCMProcessor);