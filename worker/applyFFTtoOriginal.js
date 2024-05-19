onmessage = async (e) => {
  [
    "../dft_implimentation/complex.js",
    "../dft_implimentation/dft.js",
    "../dft_implimentation/fft.js",
    "../dft_implimentation/fftUtil.js",
    "../dft_implimentation/idft.js",
    "../dft_implimentation/ifft.js",
    "../dft_implimentation/noiseRemoval.js",
    "../dft_implimentation/twiddle.js",
  ].forEach((a) => importScripts(a));

  console.log(e.data[0]);

  const [resLeft, resRight] = await Promise.all([
    fftRemoveOnChannel(e.data[0]),
    fftRemoveOnChannel(e.data[1]),
  ]);

  console.log(resLeft);

  postMessage([resLeft, resRight]);
};
