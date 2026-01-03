const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const LOGIN_KEY = "VIP*111";
let history = [];
let cached = null;

/* =========================
   INDIA TIME (IST)
   ========================= */
function nowIST() {
  const utc = new Date();
  return new Date(utc.getTime() + (5.5 * 60 * 60 * 1000));
}

/* =========================
   PERIOD (INDIA WALL CLOCK)
   ========================= */
function getPeriod(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  const minutes = d.getHours()*60 + d.getMinutes() + 1;
  return `${y}${m}${da}100010${String(minutes).padStart(3,"0")}`;
}

function bigSmall(n){ return n >= 5 ? "Big" : "Small"; }
function color(n){
  if(n === 0) return ["Red","Violet"];
  if(n === 5) return ["Green","Violet"];
  return n % 2 === 0 ? ["Red"] : ["Green"];
}

/* =========================
   SIMPLE PRNG
   ========================= */
let prngSeed = Date.now() % 2147483647;
function prng(){
  prngSeed = (prngSeed * 48271) % 2147483647;
  return prngSeed;
}

/* =========================
   HIGH FREQUENCY (PER MINUTE)
   =========================
   - Same minute window
   - PRNG se multiple draws
   - Jis number ki frequency sabse zyada
   - Wahi final
   - Tie = 50-50
*/
function generateHighFrequency(){
  const d = nowIST();

  const SAMPLES = 300;
  const freq = Array(10).fill(0);

  for(let i = 0; i < SAMPLES; i++){
    freq[prng() % 10]++;
  }

  const max = Math.max(...freq);
  const candidates = [];
  for(let i = 0; i < 10; i++){
    if(freq[i] === max) candidates.push(i);
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    period: getPeriod(d),
    number: pick,
    bigSmall: bigSmall(pick),
    color: color(pick),
    time: d.toISOString()
  };
}

/* =========================
   ROUND LOGIC
   =========================
   30s = PREVIOUS
   00s = FINAL
*/
setInterval(() => {
  const s = nowIST().getSeconds();

  if (s === 30 && !cached) {
    cached = generateHighFrequency();
  }

  if (s === 0 && cached) {
    history.unshift(cached);
    if (history.length > 50) history.pop();
    cached = null;
  }
}, 1000);

/* =========================
   API
   ========================= */
app.post("/login",(req,res)=>{
  res.json({ ok: req.body.key === LOGIN_KEY });
});

app.get("/state",(req,res)=>{
  const d = nowIST();
  res.json({
    serverTime: d.toLocaleString("en-IN"),
    countdown: 60 - d.getSeconds(),
    previous: cached,
    history
  });
});

app.listen(3000, () => {
  console.log("SERVER RUNNING");
});
