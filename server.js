const express = require("express");
const MT19937 = require("./mt19937");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const LOGIN_KEY = "VIP*111";
let history = [];
let cached = null;

/**
 * 🔒 HIGH-FREQUENCY STATE (LOCKED SOURCE)
 * YAHI SE NUMBER AANA HAI
 * 👉 Tum apni real server/state ke hisaab se
 * 👉 is object ko UPDATE karoge (minute-wise)
 *
 * format:
 * "HH:MM": [allowedNumbers]
 */
const HIGH_FREQUENCY_STATE = {
  // example (replace with your real state)
  // "12:01": [3],
  // "12:02": [7],
};

function now() {
  return new Date();
}

function minuteKey(d) {
  return (
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

function getPeriod(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const minutes = d.getHours() * 60 + d.getMinutes() + 1;
  return `${y}${m}${da}100010${String(minutes).padStart(3, "0")}`;
}

function bigSmall(n) {
  return n >= 5 ? "Big" : "Small";
}

function color(n) {
  if (n === 0) return ["Red", "Violet"];
  if (n === 5) return ["Green", "Violet"];
  return n % 2 === 0 ? ["Red"] : ["Green"];
}

/**
 * 🔒 MT19937 + HIGH-FREQUENCY FILTER (LOCKED)
 * - MT19937 server-side hi
 * - Final ACCEPT sirf HIGH_FREQUENCY_STATE se
 * - Server apni taraf se kuch decide nahi karta
 */
function generate() {
  const d = now();
  const key = minuteKey(d);
  const allowed = HIGH_FREQUENCY_STATE[key] || [];

  // safety: agar state empty ho to koi output nahi
  if (allowed.length === 0) return null;

  const seed = Number(
    `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}${d.getHours()}${d.getMinutes()}`
  );
  const mt = new MT19937(seed);

  let num;
  // MT19937 se number nikalte raho jab tak allowed me na ho
  do {
    num = mt.extractNumber() % 10;
  } while (!allowed.includes(num));

  return {
    period: getPeriod(d),
    number: num,
    bigSmall: bigSmall(num),
    color: color(num),
    time: d.toISOString(),
  };
}

/**
 * 🔒 1 MINUTE ROUND
 * 30s = PREVIOUS (LOCK)
 * 00s = FINAL (HISTORY)
 */
setInterval(() => {
  const s = now().getSeconds();

  if (s === 30 && !cached) {
    cached = generate(); // PREVIOUS
  }

  if (s === 0 && cached) {
    history.unshift(cached); // FINAL
    if (history.length > 50) history.pop();
    cached = null;
  }
}, 1000);

app.post("/login", (req, res) => {
  res.json({ ok: req.body.key === LOGIN_KEY });
});

app.get("/state", (req, res) => {
  const d = now();
  res.json({
    serverTime: d.toISOString(),
    countdown: 60 - d.getSeconds(),
    previous: cached,
    history,
  });
});

app.listen(3000, () => console.log("SERVER RUNNING (LOCKED)"));
