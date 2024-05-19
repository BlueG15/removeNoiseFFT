function MetaPanelWelcome() {
  const innerHTML = `
    <b>Remove noise from audio using <a>DFT</a></b>
    <div style="height: 10px"></div>
    <div style="padding: 30px; text-align: justify">
      According to our research, in mathematics, the discrete Fourier
      transform (DFT) converts a finite sequence of equally-spaced samples
      of a function into a same-length sequence of equally-spaced samples
      of the discrete-time Fourier transform (DTFT), which is a
      complex-valued function of frequency.
    </div>
    <div style="height: 40px"></div>
  `;

  return innerHTML;
}

function LoadingIcon() {
  return `
    <img src="./loading.svg" style="height: 150px;" />
    <b style="margin-bottom: 30px">Processing file . . .</b>
    <br />
  `;
}

/**
 * @param {string} name File name
 * @param {string} size File size
 * @returns {string}
 */
function FileInfo(name = "unnamed.unknown", size = "Unknown") {
  return `
    <h3 class="m10 tac">Current file<br/>${name}</h3>
    <h3 class="m10">File size: ${size}</h3>
    <br />
    <button 
      style="
        background: #1dea79; 
        margin-bottom: 20px; 
        max-width: none;
      " 
      onclick="applyFFTOnOriginal()"
    >
        Process file
    </button>
  `;
}
