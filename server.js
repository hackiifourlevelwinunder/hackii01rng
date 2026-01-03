const express = require("express");
const MT19937 = require("./mt19937");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const LOGIN_KEY = "VIP*111";
let history = [];
let cached = null;

// ---------- INDIA TIME (IST) ----------
const IST_TZ = "Asia/Kolkata";
function nowIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: IST_TZ })
  );
}

function getPeriod(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const da=String(d.getDate()).padStart(2,"0");
  const minutes=d.getHours()*60+d.getMinutes()+1;
  return `${y}${m}${da}100010${String(minutes).padStart(3,"0")}`;
}

function bigSmall(n){ return n>=5?"Big":"Small"; }
function color(n){
  if(n===0) return ["Red","Violet"];
  if(n===5) return ["Green","Violet"];
  return n%2===0?["Red"]:["Green"];
}

/**
 * 🔒 USA RNG + HIGH FREQUENCY (PER-MINUTE)
 * - MT19937 server-side (USA deploy)
 * - INDIA time for rounds
 * - Same minute me most frequent number => FINAL
 * - Tie => 50–50 (uniform)
 * - Never blank
 */
function generateHighFrequency(){
  const d = nowIST();

  // Seed uses IST minute, but execution happens on USA backend
  const seed = Number(
    `${d.getFullYear()}${d.getMonth()+1}${d.getDate()}${d.getHours()}${d.getMinutes()}`
  );
  const mt = new MT19937(seed);

  const SAMPLES = 200; // enough to see minute HF
  const freq = Array(10).fill(0);
  for(let i=0;i<SAMPLES;i++){
    freq[mt.extractNumber()%10]++;
  }

  const max = Math.max(...freq);
  const candidates = [];
  for(let i=0;i<10;i++) if(freq[i]===max) candidates.push(i);

  // 50–50 (or uniform if >2)
  const pick = candidates[Math.floor(Math.random()*candidates.length)];

  return {
    period: getPeriod(d),
    number: pick,
    bigSmall: bigSmall(pick),
    color: color(pick),
    time: d.toISOString()
  };
}

// ---------- ROUND LOGIC ----------
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

// ---------- API ----------
app.post("/login",(req,res)=>{
  res.json({ ok: req.body.key === LOGIN_KEY });
});

app.get("/state",(req,res)=>{
  const d = nowIST();
  res.json({
    serverTime: d.toISOString(),      // IST shown
    countdown: 60 - d.getSeconds(),
    previous: cached,
    history
  });
});

app.listen(3000, ()=> console.log("SERVER RUNNING (IST TIME + USA RNG + HF)"));
