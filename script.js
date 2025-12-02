const video = document.getElementById("camera");
const reading = document.getElementById("reading");
const distanceText = document.getElementById("distance");
const levelCircle = document.getElementById("levelCircle");
const toast = document.getElementById("toast");
const tableBody = document.querySelector("#dataTable tbody");

// Sensitivity slider
const sensSlider = document.getElementById("sensitivity");
const sensValue = document.getElementById("sensValue");

let ctx, canvas, lastLog = 0;

sensSlider.addEventListener("input", () => {
  sensValue.textContent = sensSlider.value;
});

async function startSensors() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "environment" },
    });

    video.srcObject = stream;

    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);

    function process() {
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      
      let avg = sum / dataArray.length;

      // Sensitivity multiplier
      let sensitivity = parseFloat(sensSlider.value);

      // Scale to 120 dB (new max)
      let db = (avg / 255) * 120 * sensitivity;

      // Clamp
      db = Math.max(0, Math.min(120, db));

      const distance = estimateDistance(video);

      updateUI(db, distance);
      requestAnimationFrame(process);
    }

    process();
  } catch (err) {
    alert("⚠️ Please allow camera and microphone access for this to work!");
    console.error(err);
  }
}

// Brightness sim distance
function estimateDistance(videoEl) {
  if (!ctx || !canvas) return 0;

  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  if (!width || !height) return 0;

  canvas.width = width / 10;
  canvas.height = height / 10;
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let brightness = 0;

  for (let i = 0; i < pixels.length; i += 4)
    brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

  brightness /= pixels.length / 4;

  let distance = 3 - (brightness / 255) * 3;
  distance = Math.max(0.2, Math.min(3.0, distance));

  return parseFloat(distance.toFixed(2));
}

function updateUI(db, distance) {
  const now = new Date();
  const timeString = now.toLocaleTimeString();

  reading.textContent = db.toFixed(1) + " dB";
  distanceText.textContent = distance + " m";

  // Adjust circle for 120 dB scale
  const offset = 283 - (db / 120) * 283;
  levelCircle.style.strokeDashoffset = offset;

  // Alerts:
  if (db >= 100) showToast("🔥 OPEN PIPE LEVEL DETECTED (100+ dB)!");
  else if (db >= 70) showToast("⚠️ Loud conversation detected (70+ dB)");

  if (now - lastLog >= 1000) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${timeString}</td><td>${db.toFixed(1)}</td><td>${distance}</td>`;
    tableBody.prepend(row);
    lastLog = now;
  }
}

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), 2000);
}

window.addEventListener("load", () => startSensors());
