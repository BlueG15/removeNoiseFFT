/**
 * @typedef {"32"|"64"|"128"|"256"|"512"|"1024"|"2048"|"4096"|"8192"|"16384"|"32768"} AcceptableFFTSize
 */

/**
 * Duration format a.k.a second_to_ms
 * @param {number} d seconds
 * @param {string} min Min seperator
 * @param {string} sec Sec seperator
 * @returns {string}
 */
function durationFormat(d, min = "", sec = "") {
  d = isNaN(Number(d)) ? 0 : Number(d);

  const m = Math.floor(d / 60);
  const s = Math.floor(d - m * 60);

  const mDisplay = m;
  const sDisplay = s < 10 ? "0" + s : s;

  return mDisplay + " " + min + " " + sDisplay + " " + sec;
}

/**
 * Get Icon
 * @param {string} icon Icon ID
 * @returns {string} Span string
 *
 * @description See more icon id at https://fonts.google.com/icons
 */
const getIcon = (icon) =>
  `<span style="pointer-events: none" class="material-symbols-outlined"> ${icon} </span>`;

/**
 * A weak temporary implementation of EventEmitter
 */
class EventEmitter {
  constructor() {
    this.events = {};
    this.listenerId = 0;
  }

  /**
   * Add listener
   * @param {string} eventName Event name
   * @param {(data: any) => void} listener Listener
   * @returns {string} Listener ID
   *
   * @description Save your listener ID if you want to remove it in the future
   */
  on(eventName, listener) {
    const listenerId = `listener_${this.listenerId++}`;
    if (!this.events[eventName]) {
      this.events[eventName] = {};
    }
    this.events[eventName][listenerId] = listener;
    return listenerId;
  }

  /**
   * Emit listener
   * @param {string} eventName Event name
   * @param  {...any} args
   */
  emit(eventName, ...args) {
    if (this.events[eventName]) {
      Object.values(this.events[eventName]).forEach((listener) => {
        listener.apply(this, args);
      });
    }
  }

  /**
   * Remove listener
   * @param {string} eventName Event name
   * @param {string} listenerId Listener ID (Obtain from on())
   */
  off(eventName, listenerId) {
    if (this.events[eventName] && this.events[eventName][listenerId]) {
      delete this.events[eventName][listenerId];
    }
  }
}

class CustomAudio {
  /**
   *
   * @param {AudioBuffer | undefined} buffer Audio buffer
   * @param {boolean} autoPlay Auto play when finished initializing.
   */
  constructor(buffer, autoPlay) {
    //* Temporary fix for current time offset.
    this.__SKIP_TO__ = 0;

    this.repeat = false;
    this.currentTime = -1;
    this.duration = -1;
    this.paused = true;

    this._followSeek = false;
    this._setBuffer(buffer);

    this._potentialSeek = 0;

    this.__BARWRAPPER_ACTIVE__ = false;

    /**
     * @type {number}
     * @description Test property
     * @private
     */
    this.maxByteFreq = 0;
    /**
     * @type {number}
     * @description Test property
     * @private
     */
    this.visualBarCount = 30;

    /**
     * @type {AnalyserNode}
     * @private
     */
    this.__AUDIO_ANALYSER__;

    if (buffer) {
      try {
        if (autoPlay) this.__AUDIO_SOURCE__.start();
      } catch (e) {
        console.error(e);
      }
    }

    this.__LOCAL_EMITTER__ = new EventEmitter();
    requestAnimationFrame(() => this._localInterval());

    this.__LOCAL_EMITTER__.on(
      "timeupdate",
      this._handleVisualProgress.bind(this)
    );
  }

  _handleVisualProgress([cur, dur]) {
    if (this._followSeek) cur = dur * this._potentialSeek;

    const secLen = Math.round((dur * 1000) / this.visualBarCount) / 1000;
    const secCount = Math.ceil(cur / secLen);

    for (let i = 0; i < secCount - 1; i++) {
      this.__LOCAL_EMITTER__.emit("bar-prog-" + i, 1);
    }

    for (let i = secCount; i < this.visualBarCount; i++) {
      this.__LOCAL_EMITTER__.emit("bar-prog-" + i, 0);
    }

    const pastRoundedSection = (secCount - 1) * secLen;
    const curSection = cur - pastRoundedSection;
    const ratio = curSection / secLen;

    this.__LOCAL_EMITTER__.emit("bar-prog-" + (secCount - 1), ratio);
  }

  /**
   * Internal interval clock
   * @private
   */
  _localInterval() {
    this.paused = this.isPaused();
    this.__LOCAL_EMITTER__.emit("paused", this.paused);
    this.resetVisualizer(true);
    if (this.paused) return requestAnimationFrame(() => this._localInterval());

    // console.log(this.__AUDIO_SOURCE__.buffer?.length || 0);
    this.duration = this.getDuration();
    this.currentTime = this.getCurrentTime();

    this.__LOCAL_EMITTER__.emit("timeupdate", [
      this.currentTime,
      this.duration,
    ]);

    this._updateVisualiser(0);

    requestAnimationFrame(() => this._localInterval());
  }

  _updateVisualiser(style = 0) {
    const data = this.requestFrequencyData("64");
    if (!data || !data.length) return;

    // this.maxByteFreq = Math.max(...nonZeroData);

    if (style === 0) {
      for (let i = 0; i < this.visualBarCount; i++) {
        this.__LOCAL_EMITTER__.emit("bar-change-" + i, data[i]);
      }

      return;
    }

    const hBar = this.visualBarCount / 2;
    const nonZeroData = [...data.filter((a) => a > 0).slice(0, hBar)];

    for (let i = 0; i < hBar - nonZeroData.length; i++) {
      nonZeroData.push(0);
    }

    const newData = [...nonZeroData];

    for (let i = 0; i < hBar; i++) {
      const ratio = newData[i];

      this.__LOCAL_EMITTER__.emit("bar-change-" + (hBar - i), ratio);
      this.__LOCAL_EMITTER__.emit("bar-change-" + (hBar + i), ratio);
    }
  }

  /**
   * Reset context + source
   * @param {AudioBuffer} buffer Audio buffer
   */
  _setBuffer(buffer) {
    this.__AUDIO_CONTEXT__ = new AudioContext();
    this.__AUDIO_SOURCE__ = this.__AUDIO_CONTEXT__.createBufferSource();
    this.__AUDIO_ANALYSER__ = this.__AUDIO_CONTEXT__.createAnalyser();
    this.__AUDIO_SOURCE__.connect(this.__AUDIO_ANALYSER__);
    this.__AUDIO_ANALYSER__.connect(this.__AUDIO_CONTEXT__.destination);
    this.__AUDIO_SOURCE__.onended = this._handleSourceEnd_.bind(this);
    this.__CURRENT_BUFFER__ = buffer;
    this.__AUDIO_SOURCE__.buffer = buffer;
  }

  /**
   * Get channel data
   * @param {0 | 1} i Channel Index
   * @returns {Float32Array}
   */
  _getChannelData(i = 0) {
    if (!this.__CURRENT_BUFFER__) return [];

    return this.__CURRENT_BUFFER__.getChannelData(i);
  }

  /**
   * Handle mouse move
   * @param {MouseEvent} e event
   * @param {HTMLElement} target The seek bar
   * @private
   */
  _handleMouseMove(e, target) {
    const { left, width } = target.getBoundingClientRect();
    const mx = e.clientX;

    const perf = Math.min(Math.max(0, mx - left), width);
    this._potentialSeek = perf / width;

    // console.log(this._potentialSeek);
    this.__LOCAL_EMITTER__.emit("seeking", perf / width);
  }

  /**
   * Reset bar visualizer
   * @param {boolean} barHeightOnly Reset bar height only
   */
  resetVisualizer(barHeightOnly = false) {
    for (let i = 0; i < this.visualBarCount; i++) {
      this.__LOCAL_EMITTER__.emit("bar-change-" + i, 0);
      if (barHeightOnly) continue;
      this.__LOCAL_EMITTER__.emit("bar-prog-" + i, 0);
    }
  }

  /**
   * Handle onEnded for current source
   * @private
   */
  _handleSourceEnd_() {
    // console.log(this.repeat);
    this.resetVisualizer();
    this.__LOCAL_EMITTER__.emit("ended");

    if (this.repeat) {
      this.play(this.__CURRENT_BUFFER__, 0);
      return;
    }

    this.pause(0);
  }

  /**
   * Check if player is paused
   * @returns {boolean} isPaused?
   */
  isPaused() {
    return this.__AUDIO_CONTEXT__.state === "suspended";
  }

  /**
   * Get byte frequency data
   * @param {AcceptableFFTSize} fftSize
   * @returns {Uint8Array | undefined} Byte frequency
   *
   * @description See https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize for more info
   */
  requestFrequencyData(fftSize = "2048") {
    if (!this.__CURRENT_BUFFER__ || !this.__AUDIO_SOURCE__.context) return;

    this.__AUDIO_ANALYSER__.fftSize = Number.parseInt(fftSize);
    const bufferLength = this.__AUDIO_ANALYSER__.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.__AUDIO_ANALYSER__.getByteFrequencyData(dataArray);

    return dataArray;
  }

  /**
   *  Get current audio duration
   * @returns {number} seconds
   */
  getDuration() {
    if (!this.__CURRENT_BUFFER__) return -1;
    return this.__CURRENT_BUFFER__.duration;
  }

  /**
   * Get current time
   * @returns {number} seconds
   */
  getCurrentTime() {
    return Math.min(
      this.getDuration(),
      this.__AUDIO_CONTEXT__.currentTime + this.__SKIP_TO__
    );
  }

  /**
   * Toggle play / pause
   * @returns {boolean} isPaused?
   */
  togglePlayPause() {
    const nothing = !this.__AUDIO_SOURCE__.buffer;

    if (this.isPaused() && !nothing) {
      this.__AUDIO_CONTEXT__.resume().catch();
      this.__LOCAL_EMITTER__.emit("paused", false);
      return false;
    }

    this.__AUDIO_CONTEXT__.suspend();
    this.__LOCAL_EMITTER__.emit("paused", true);
    return true;
  }

  /**
   * Play audio buffer, toggle play / pause if no param.
   * @param {AudioBuffer | undefined} buffer Audio buffer
   * @param {number} offset Offset (seconds)
   */
  play(buffer, offset) {
    if (!buffer) return this.togglePlayPause();

    try {
      this.__AUDIO_SOURCE__.stop();
      this.__AUDIO_SOURCE__.disconnect();
      this.__AUDIO_SOURCE__.onended = undefined;
      // this.__AUDIO_SOURCE__.buffer = undefined;
    } catch {}

    this._setBuffer(buffer);
    this.__AUDIO_SOURCE__.start(0, offset);
    this.__SKIP_TO__ = offset;
    this.__AUDIO_CONTEXT__.resume().catch();

    this.__LOCAL_EMITTER__.emit("playing");

    this.resetVisualizer();
  }

  /**
   * Pause playback and seek to second(s).
   * @param {number} seconds Seek to after pause.
   */
  pause(seconds) {
    if (!isNaN(seconds)) this.play(this.__CURRENT_BUFFER__, seconds);
    this.__AUDIO_CONTEXT__.suspend();
  }

  /**
   * Pause playback + seek to 0
   */
  reset() {
    this.pause(0);
  }

  /**
   * Seek / Navigate to miliseconds
   * @param {number} seconds
   */
  seekTo(seconds) {
    this.play(this.__CURRENT_BUFFER__, seconds);
  }

  /**
   * Get audio controls interface.
   * @param {string} title
   * @param {number} barCount
   * @returns {HTMLDivElement}
   */
  getControls(title = "Audio player", barCount = 32) {
    this.visualBarCount = barCount;

    const wrapper = document.createElement("div");
    wrapper.className = "flex coll full-w aictr g10";
    wrapper.id = generateRandomId(12);

    // const getBar = (id) =>
    //   `<div style="height: ${
    //     Math.random() * 60 + 40
    //   }%" class="bar" id=${id}></div>`;

    const titleDiv = document.createElement("div");
    titleDiv.innerText = title;

    const audioFrame = document.createElement("div");
    audioFrame.className = "audio-frame";

    const playButton = document.createElement("div");
    playButton.className = "icon-button";
    playButton.innerHTML = getIcon("play_arrow");
    playButton.onclick = () => this.togglePlayPause();
    this.__LOCAL_EMITTER__.on("paused", (paused) => {
      if (paused && playButton.innerText !== "play_arrow") {
        playButton.innerHTML = getIcon("play_arrow");
        return;
      }

      if (playButton.innerText !== "pause" && !paused) {
        playButton.innerHTML = getIcon("pause");
      }
    });

    const barWrapper = document.createElement("div");
    barWrapper.className = "bar-wrapper";
    barWrapper.append(
      ...Array(barCount)
        .fill(1)
        .map((_, i) => {
          const bar = document.createElement("div");

          // bar.innerHTML = `
          //   <div style="background: #e979cf; flex: 1"></div>
          //   <div style="height: 20px"></div>
          //   <div style="background: #e979cf; flex: 1"></div>
          // `;
          // bar.className = "bar flex coll ofhidden";

          bar.className = "bar";
          2;
          bar.style.setProperty("--h", 0);
          bar.style.setProperty("--lpr", 0);

          this.__LOCAL_EMITTER__.on("bar-change-" + i, (a) => {
            bar.style.setProperty("--h", a || 0);
          });

          this.__LOCAL_EMITTER__.on("bar-prog-" + i, (a) => {
            bar.style.setProperty("--lpr", a || 0);
          });

          return bar;
        })
    );

    const timeSeek = document.createElement("div");
    timeSeek.className = "time-seek";
    this.__LOCAL_EMITTER__.on("seeking", (p) => {
      timeSeek.innerText = durationFormat(p * this.getDuration(), ":");
    });

    barWrapper.appendChild(timeSeek);

    const handleMM = (e) => {
      this._handleMouseMove(e, barWrapper);
    };

    barWrapper.onmousedown = () => {
      this._followSeek = true;
      this.__BARWRAPPER_ACTIVE__ = true;
    };

    barWrapper.onmousemove = handleMM;

    barWrapper.onmouseenter = () =>
      document.addEventListener("mousemove", handleMM);

    barWrapper.onmouseleave = () =>
      this._followSeek ? 0 : document.removeEventListener("mouseup", handleMM);

    barWrapper.ondragstart = (e) => e.preventDefault();
    barWrapper.ondrag = (e) => e.preventDefault();

    document.addEventListener("mouseup", () => {
      this._followSeek = false;

      if (!this.__BARWRAPPER_ACTIVE__) return;

      document.removeEventListener("mousemove", handleMM);
      this.seekTo(this._potentialSeek * this.getDuration());
      this.__BARWRAPPER_ACTIVE__ = false;
    });

    this.__LOCAL_EMITTER__.on("seeking", (p) =>
      barWrapper.style.setProperty("--a", p)
    );

    this.__LOCAL_EMITTER__.on(
      "ended",
      () => (barWrapper.className = "bar-wrapper smooth")
    );
    this.__LOCAL_EMITTER__.on(
      "paused",
      (a) => (barWrapper.className = a ? "bar-wrapper smooth" : "bar-wrapper")
    );
    this.__LOCAL_EMITTER__.on(
      "playing",
      () => (barWrapper.className = "bar-wrapper")
    );

    const timeStamp = document.createElement("b");
    timeStamp.innerText = "00:00";

    this.__LOCAL_EMITTER__.on("timeupdate", ([cur, dur]) => {
      const displayCur = durationFormat(cur, ":");
      const displayDur = durationFormat(dur, ":");

      timeStamp.innerHTML = `
        <div class="bold">${displayCur}</div>
        ---
        <div class="bold">${displayDur}</div>
      `;
    });

    audioFrame.append(playButton, timeStamp, barWrapper);
    wrapper.append(titleDiv, audioFrame);

    return wrapper;
  }
}
