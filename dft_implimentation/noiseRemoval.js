function findClosestPowerOfTwo(a) {
  //a is possitive int
  let prod = 1;

  while (prod < a) {
    prod = prod * 2;
  }

  return prod;
}

/**
 * Perform stuff on stuff
 * @param {Float32Array} PCMRAW Channel
 * @returns {Promise<Float32Array>}
 */
const fftRemoveOnChannel = (PCMRAW, leniency = 3) => {
  const PCM = [
    ...PCMRAW,
    ...new Array(findClosestPowerOfTwo(PCMRAW.length) - PCMRAW.length).fill(0),
  ];

  return new Promise((resolve, _) => {
    let fftRes = fft.fft(PCM);
    let maxMagnitude = 0;

    var filtered = fftRes.map((a, i) => {
      //0 means removed, 1 mean keep
      let magnitude = complex.magnitude(a);
      if (i < 100 || i > 17000) return 0; //outside human voice range
      maxMagnitude = Math.max(maxMagnitude, magnitude); //records max occured magnitude
      return 1;
    });
    filtered = filtered.map((a, i) => {
      if(complex.magnitude(fftRes[i]) < maxMagnitude / leniency) return 0; //filters out anything too low
      return a;
    });

    fftRes = fftRes.map((a, _) => (filtered[_] != 0 ? a : [0, 0]));
    resolve(ifft.ifft(fftRes).map((a) => (Math.abs(a[0]) < 1e-10 ? 0 : a[0])));
  });
};

const test = () => {
  var channel = audioSrc.original.__CURRENT_BUFFER__.getChannelData(0);
  const PCM = [
    ...channel,
    ...new Array(findClosestPowerOfTwo(channel.length) - channel.length).fill(
      0
    ),
  ];

  console.log(PCM.length);
  var a = fft.fft(PCM);

  var ifftRes = ifft.ifft(a);
  return [PCM, ifftRes];
};

/**
 * Apply FFT on audio.
 * @param {AudioBuffer} audioBuffer Audio buffer
 */
const applyFFTToAudioBuffer = async (audioBuffer) => {
  const PCMLeft = audioBuffer.getChannelData(0);
  const PCMRight = audioBuffer.getChannelData(1);

  const [resLeft, resRight] = await Promise.all([
    fftRemoveOnChannel(PCMLeft),
    fftRemoveOnChannel(PCMRight),
  ]);

  const edittedBuffer = new AudioBuffer({
    length: audioBuffer.length,
    numberOfChannels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
  });

  audioBuffer.copyToChannel(new Float32Array(resLeft), 0, 0);
  audioBuffer.copyToChannel(new Float32Array(resRight), 1, 0);

  return edittedBuffer;
};
