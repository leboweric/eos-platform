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
    console.log('🎤 AudioWorklet processing audio');
    
    const input = inputs[0];
    
    console.log('🔍 [AudioWorklet] Input details:', {
      hasInput: input.length > 0,
      channelCount: input.length,
      firstChannelLength: input[0]?.length || 0,
      bufferIndex: this.bufferIndex
    });
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        // When buffer is full, convert to PCM and send
        if (this.bufferIndex >= this.bufferSize) {
          console.log('📤 AudioWorklet buffer full, sending PCM data');
          this.sendPCMData();
          this.bufferIndex = 0;
        }
      }
    } else {
      console.warn('⚠️ [AudioWorklet] No audio input available');
    }
    
    return true; // Keep processor alive
  }
  
  sendPCMData() {
    console.log('🔄 [AudioWorklet] Converting PCM data');
    
    // Convert Float32Array to Int16Array (PCM S16LE)
    const pcmData = new Int16Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      // Clamp and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, this.buffer[i]));
      pcmData[i] = Math.floor(sample * 32767);
    }
    
    console.log('📤 AudioWorklet posted message');
    
    // Send PCM data to main thread
    this.port.postMessage({
      type: 'pcm-data',
      data: pcmData.buffer
    });
    
    console.log('✅ [AudioWorklet] Message posted successfully');
  }
}

registerProcessor('pcm-processor', PCMProcessor);