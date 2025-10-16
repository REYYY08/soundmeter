const startBtn = document.getElementById("startBtn");
const reading = document.getElementById("reading");
const levelCircle = document.getElementById("levelCircle");

let audioContext, analyser, dataArray;

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.innerText = "Listening...";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Float32Array(analyser.fftSize);
    source.connect(analyser);

    animateMeter();
  } catch (error) {
    alert("❌ Microphone access denied or not supported on this device.");
    console.error(error);
    startBtn.disabled = false;
    startBtn.innerText = "Start Listening";
  }
});

function animateMeter() {
  analyser.getFloatTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
  const rms = Math.sqrt(sum / dataArray.length);
  const db = 20 * Math.log10(rms + 1e-6);

  // Normalize for visual scale (0 = silence, 100 = loud)
  const level = Math.min(Math.max((db + 60) / 60, 0), 1);
  const offset = 283 - level * 283;
  levelCircle.style.strokeDashoffset = offset;
  reading.textContent = `${db.toFixed(1)} dB`;

  requestAnimationFrame(animateMeter);
}
