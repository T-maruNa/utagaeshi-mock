// うたがえし SNS画像ジェネレータ
// 使い方は同じフォルダの README.md を見ること。
const { chromium } = require('playwright');
const fs = require('fs');

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.5'/></svg>")`;

const P = {
  warm:  { bg:'linear-gradient(148deg,#fffdf7 0%,#fff6e9 34%,#ffecd6 68%,#fadfc8 100%)',
           glow:'rgba(255,246,224,.98)', glow2:'rgba(255,228,192,.46)',
           ink:'#332c24', sub:'#9c8b72', askc:'#7d6c52', rule:'#e6d8c1', mark:'#a8977f', spark:'rgba(255,224,172,.95)', night:false },
  fresh: { bg:'linear-gradient(150deg,#fbfdf8 0%,#f4f9ef 36%,#e9f1e2 70%,#dbe7d2 100%)',
           glow:'rgba(253,255,249,.96)', glow2:'rgba(216,234,206,.52)',
           ink:'#2b332a', sub:'#7e8c78', askc:'#5f7059', rule:'#d6e2cd', mark:'#8b9a85', spark:'rgba(232,248,222,.95)', night:false },
  sky:   { bg:'linear-gradient(150deg,#fdfefc 0%,#f2f9f7 34%,#e6f1f3 68%,#d5e7ee 100%)',
           glow:'rgba(255,253,242,.94)', glow2:'rgba(206,231,238,.52)',
           ink:'#28323a', sub:'#778993', askc:'#546a78', rule:'#d0e0e8', mark:'#87979f', spark:'rgba(236,250,255,.95)', night:false },
  cool:  { bg:'linear-gradient(150deg,#f7f9fa 0%,#eef2f4 36%,#e3e9ed 70%,#d6dee4 100%)',
           glow:'rgba(252,254,255,.95)', glow2:'rgba(214,228,238,.50)',
           ink:'#2c3238', sub:'#7d8a94', askc:'#5c6c78', rule:'#d3dde4', mark:'#8b97a1', spark:'rgba(226,240,250,.95)', night:false },
  quiet: { bg:'linear-gradient(152deg,#f3f0e7 0%,#ece8dd 38%,#e3ded1 70%,#d8d2c3 100%)',
           glow:'rgba(255,252,242,.90)', glow2:'rgba(236,230,218,.50)',
           ink:'#2f2b24', sub:'#8f8878', askc:'#6f6857', rule:'#ddd6c6', mark:'#a19981', spark:'rgba(255,250,232,.9)', night:false },
  night: { bg:'linear-gradient(150deg,#3c4149 0%,#333941 38%,#2b3038 72%,#232830 100%)',
           glow:'rgba(120,132,148,.42)', glow2:'rgba(96,108,124,.34)',
           ink:'#f2efe8', sub:'#a3aab4', askc:'#c3cad4', rule:'#5a626d', mark:'#9aa2ad', spark:'rgba(206,220,236,.85)', night:true },
};

const sparks = (list,c) => list.map(([w,x,y,o]) =>
  `<i style="width:${w}px;height:${w}px;left:${x}px;top:${y}px;opacity:${o};box-shadow:0 0 ${w*1.8}px ${c}"></i>`).join('');

const ASK = 'あなたなら、この景色に<br>どんな言葉を残しますか。';

function page(d, W, H, S){
  const p = P[d.palette];
  return `<meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;background:${p.bg};font-family:'Shippori Mincho',serif;color:${p.ink};
     display:flex;align-items:center;justify-content:center}
.glow{position:absolute;left:${S.gx};top:${S.gy};transform:translate(-50%,-50%);width:${S.gw}px;height:${S.gw}px;
      border-radius:50%;background:radial-gradient(circle,${p.glow} 0%,${p.glow2} 43%,transparent 71%);filter:blur(30px)}
.glow2{position:absolute;left:22%;top:92%;transform:translate(-50%,-50%);width:${Math.round(S.gw*.78)}px;
      height:${Math.round(S.gw*.78)}px;border-radius:50%;
      background:radial-gradient(circle,${p.glow2} 0%,transparent 66%);filter:blur(42px)}
i{position:absolute;border-radius:50%;background:${p.night?'#cfdae8':'#fffdf4'}}
.grain{position:absolute;inset:0;mix-blend-mode:${p.night?'overlay':'multiply'};opacity:.13;
       background-image:${GRAIN};pointer-events:none}
.t{position:relative;text-align:center;padding:0 ${S.pad}px;margin-bottom:${S.shift}px}
.lbl{font-family:'Zen Kaku Gothic New',sans-serif;font-size:${S.lbl}px;letter-spacing:.34em;
     color:${p.sub};margin-bottom:${S.lblGap}px;padding-left:.34em}
.scene{font-size:${S.scene}px;line-height:2.08;letter-spacing:.08em;color:${p.ink}}
.line{width:${S.lineW}px;height:1px;background:${p.rule};margin:${S.askGap}px auto}
.ask{font-family:'Zen Kaku Gothic New',sans-serif;font-size:${S.ask}px;line-height:1.94;
     letter-spacing:.1em;color:${p.askc}}
.mark{position:absolute;left:0;right:0;bottom:${S.mb}px;text-align:center;
      font-family:'Zen Maru Gothic',sans-serif;font-size:${S.mark}px;font-weight:700;
      letter-spacing:.2em;color:${p.mark};opacity:.85}
.mark span{font-family:'Zen Kaku Gothic New',sans-serif;font-weight:400;
      font-size:${Math.round(S.mark*.62)}px;letter-spacing:.18em;margin-left:${Math.round(S.mark*.5)}px;opacity:.85}
</style>
<div class="glow"></div><div class="glow2"></div>
${sparks(S.sp,p.spark)}
<div class="grain"></div>
<div class="t">
  <div class="lbl">今日の景色</div>
  <div class="scene">${d.scene}</div>
  <div class="line"></div>
  <div class="ask">${ASK}</div>
</div>
<div class="mark">うたがえし<span>開発中</span></div>`;
}

const TALL = { gx:'62%', gy:'25%', gw:1180, pad:96, lbl:28, lblGap:52, scene:58, ask:38,
               lineW:200, askGap:76, mark:34, mb:150, shift:0,
               sp:[[13,180,430,.85],[9,880,560,.65],[16,250,1560,.45],[11,830,1620,.55],[8,520,300,.5],[12,920,1180,.4]] };
const WIDE = { gx:'72%', gy:'24%', gw:1100, pad:180, lbl:23, lblGap:40, scene:46, ask:30,
               lineW:170, askGap:56, mark:28, mb:50, shift:70,
               sp:[[11,1188,206,.85],[7,1330,430,.65],[13,1084,612,.5],[8,1436,250,.55],[9,196,150,.55],[12,1256,790,.4]] };

const DAYS = [
{ file:'06_高台の小川', palette:'sky',
  scene:'高台に座り、友人と語らう。<br>公園の小川が穏やかに流れる。' },
];


(async () => {
  fs.mkdirSync('out', { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const d of DAYS) {
    const pt = await b.newPage({ viewport:{width:1080,height:1920} });
    await pt.setContent(page(d,1080,1920,TALL)); await pt.waitForTimeout(400);
    await pt.screenshot({ path:`out/TT_${d.file}.png` }); await pt.close();

    const pw = await b.newPage({ viewport:{width:1600,height:900}, deviceScaleFactor:2 });
    await pw.setContent(page(d,1600,900,WIDE)); await pw.waitForTimeout(400);
    await pw.screenshot({ path:`out/X_${d.file}.png` }); await pw.close();
    console.log('done', d.file);
  }
  await b.close();
})();
