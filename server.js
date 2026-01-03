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
   PERIOD with 5:30 AM RESET
   ========================= */
function getPeriod(d){
  // Reset day at 5:30 AM IST
  let periodDate = new Date(d);
  const resetMinutes = 5 * 60 + 30;
  const currentMinutes = d.getHours() * 60 + d.getMinutes();

  if (currentMinutes < resetMinutes) {
    periodDate.setDate(periodDate.getDate() - 1);
  }

  const y = periodDate.getFullYear();
  const m = String(periodDate.getMonth()+1).padStart(2,"0");
  const da = String(periodDate.getDate()).padStart(2,"0");

  const minuteIndex = currentMinutes - resetMinutes + 1;
  const finalIndex = minuteIndex > 0 ? minuteIndex : (1440 - resetMinutes + currentMinutes + 1);

  return `${y}${m}${da}100010${String(finalIndex).padStart(3,"0")}`;
}

function bigSmall(n){ return n >= 5 ? "Big" : "Small"; }
function color(n){
  if(n === 0) return ["Red","Violet"];
  if(n === 5) return ["Green","Violet"];
  return n % 2 === 0 ? ["Red"] : ["Green"];
}

/* =========================
   REAL PRNG (WINGO / JALWA STYLE)
   ========================= */
let prngSeed = Date.now() % 2147483647;
function prng(){
  prngSeed = (prngSeed * 48271) % 2147483647;
  return prngSeed;
}

function generateRound(){
  const d = nowIST();
  const pick = prng() % 10;

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
    cached = generateRound();
  }

  if(s === 0 && cached){
    history.unshift(cached);
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
  console.log("SERVER RUNNING | PERIOD RESET 5:30 AM IST");
});
