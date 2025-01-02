class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffers = [];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    // Get the mono channel data
    const audioData = input[0];
    
    // Clone the data since it's from a SharedArrayBuffer
    const buffer = new Float32Array(audioData);
    
    // Send the buffer to the main thread
    this.port.postMessage({ audioData: buffer });
    
    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor); 