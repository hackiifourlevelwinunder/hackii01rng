const express = require("express");
const MT19937 = require("./mt19937");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const LOGIN_KEY = "VIP*111";
let history = [];
let cached = null;

function now(){ return new Date(); }

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

function generate(){
  const d=now();
  const seed=Number(`${d.getFullYear()}${d.getMonth()+1}${d.getDate()}${d.getHours()}${d.getMinutes()}`);
  const mt=new MT19937(seed);
  const num=mt.extractNumber()%10;
  return {period:getPeriod(d),number:num,bigSmall:bigSmall(num),color:color(num),time:d.toISOString()};
}

setInterval(()=>{
  const s=now().getSeconds();
  if(s===30 && !cached) cached=generate();
  if(s===0 && cached){
    history.unshift(cached);
    if(history.length>50) history.pop();
    cached=null;
  }
},1000);

app.post("/login",(req,res)=>res.json({ok:req.body.key===LOGIN_KEY}));

app.get("/state",(req,res)=>{
  const d=now();
  res.json({
    serverTime:d.toISOString(),
    countdown:60-d.getSeconds(),
    previous:cached,
    history
  });
});

app.listen(3000,()=>console.log("running"));