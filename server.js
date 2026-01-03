const express = require("express");
const crypto = require("crypto");
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
   PERIOD with 5:30 AM RESET (IST)
   ========================= */
function getPeriod(d){
  const resetMinutes = 5 * 60 + 30; // 5:30 AM
  const currentMinutes = d.getHours() * 60 + d.getMinutes();

  // Decide period date
  const periodDate = new Date(d);
  if (currentMinutes < resetMinutes) {
    periodDate.setDate(periodDate.getDate() - 1);
  }

  const y = periodDate.getFullYear();
  const m = String(periodDate.getMonth()+1).padStart(2,"0");
  const da = String(periodDate.getDate()).padStart(2,"0");

  // Minute index from reset
  const idx = currentMinutes - resetMinutes + 1;
  const minuteIndex = idx > 0 ? idx : (1440 - resetMinutes + currentMinutes + 1);

  return `${y}${m}${da}100010${String(minuteIndex).padStart(3,"0")}`;
}

function bigSmall(n){ return n >= 5 ? "Big" : "Small"; }
function color(n){
  if(n === 0) return ["Red","Violet"];
  if(n === 5) return ["Green","Violet"];
  return n % 2 === 0 ? ["Red"] : ["Green"];
}

/* =========================
   CRYPTO RNG (0–9)
   ========================= */
function cryptoRand0to9(){
  // Uniform cryptographic random integer 0–9
  return crypto.randomInt(0, 10);
}

/* =========================
   HIGH FREQUENCY (PER MINUTE)
   =========================
   - 1 minute window (IST)
   - Crypto RNG se multiple draws
   - Jis number ki frequency sabse zyada
   - Wahi FINAL
   - Tie = 50–50 (uniform)
   - Blank kabhi nahi
*/
function generateHighFrequency(){
  const d = nowIST();

  const SAMPLES = 300; // strong HF within the minute
  const freq = Array(10).fill(0);

  for(let i = 0; i < SAMPLES; i++){
    freq[cryptoRand0to9()]++;
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
setInterval(()=>{
  const s = nowIST().getSeconds();

  if(s === 30 && !cached){
    cached = generateHighFrequency(); // PREVIOUS (locked)
  }

  if(s === 0 && cached){
    history.unshift(cached);          // FINAL
    if(history.length > 50) history.pop();
    cached = null;
  }
},1000);

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

app.listen(3000, ()=> {
  console.log("SERVER RUNNING | CRYPTO RNG | HIGH FREQUENCY | IST | 5:30 RESET");
});
