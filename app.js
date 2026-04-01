// app.js — КП Generator KERAMA MARAZZI Kazakhstan (RU/KZ, PDF)
'use strict';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDEwJXSJR7REj4JC4BSIPJn_wMVrmWQ1ZmHKCCaRv3FweWfJSbd2sfOH4SG50V6PMo/exec';
const $ = id => document.getElementById(id);
let catalog = [];
let found   = [];
let currentLang = 'ru';

// ── ПЕРЕВОДЫ ──────────────────────────────────────────────────────────────
const T = {
  ru: {
    hdrSub: 'Введите артикулы — скачайте PDF',
    lblArts: 'Артикулы',
    hint: 'Через запятую, пробел или с новой строки',
    btn: '🔍 Найти артикулы',
    foundTitle: 'Найдено в каталоге:',
    vatNote: '* Цены указаны в KZT с учётом НДС 12%',
    pricePh: 'Цена, ₸',
    priceLabel: 'KZT с НДС',
    loadingCat: 'Загрузка каталога...',
    foundN: n => `Найдено ${n}. Загружаем изображения...`,
    creating: 'Создаём PDF...',
    doneN: (n, nf) => {
      let m = `✓ Готово! ${n} позиций`;
      if (nf.length) m += '. Не в каталоге: ' + nf.join(', ');
      return m;
    },
    errEmpty: 'Введите хотя бы один артикул',
    errNone: nf => 'Не найдено: ' + nf.join(', '),
    hintPrices: '— Введите цены и нажмите «Скачать PDF»',
    pdfBtn: '📄 Скачать PDF',
    pdfTitle: 'Коммерческое предложение на поставку продукции KERAMA MARAZZI',
    pdfPriceLabel: 'Цена (KZT с НДС):',
    pdfNoPrice: 'по запросу',
    pdfPerUnit: '₸/м²',
    pdfOpenSite: 'Открыть на сайте KM',
    pdfVat: '* Все цены указаны в тенге (KZT) с учётом НДС 12%',
    pdfDate: 'Дата:',
  },
  kz: {
    hdrSub: 'Артикулдарды енгізіңіз — PDF жүктеп алыңыз',
    lblArts: 'Артикулдар',
    hint: 'Үтірмен, бос орынмен немесе жаңа жолмен бөліңіз',
    btn: '🔍 Артикулдарды табу',
    foundTitle: 'Каталогтан табылды:',
    vatNote: '* Бағалар KZT-де, ҚҚС 12% қоса',
    pricePh: 'Баға, ₸',
    priceLabel: 'KZT ҚҚС-пен',
    loadingCat: 'Каталогты жүктеу...',
    foundN: n => `${n} табылды. Суреттерді жүктеу...`,
    creating: 'PDF жасалуда...',
    doneN: (n, nf) => {
      let m = `✓ Дайын! ${n} позиция`;
      if (nf.length) m += '. Каталогта жоқ: ' + nf.join(', ');
      return m;
    },
    errEmpty: 'Кем дегенде бір артикул енгізіңіз',
    errNone: nf => 'Табылмады: ' + nf.join(', '),
    hintPrices: '— Бағаларды енгізіп, «PDF жүктеу» басыңыз',
    pdfBtn: '📄 PDF жүктеу',
    pdfTitle: 'KERAMA MARAZZI өнімдерін жеткізуге коммерциялық ұсыныс',
    pdfPriceLabel: 'Баға (KZT ҚҚС-пен):',
    pdfNoPrice: 'сұраныс бойынша',
    pdfPerUnit: '₸/м²',
    pdfOpenSite: 'KM сайтында ашу',
    pdfVat: '* Барлық бағалар теңгемен (KZT), ҚҚС 12% қоса көрсетілген',
    pdfDate: 'Күні:',
  }
};
function t(key) { return T[currentLang][key]; }

// ── ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА ───────────────────────────────────────────────────
function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  $('hdr-sub').textContent = t('hdrSub');
  $('lbl-arts').textContent = t('lblArts');
  $('hint').textContent = t('hint');
  $('btn').textContent = t('btn');
  $('found-title').textContent = t('foundTitle');
  $('vat-note').textContent = t('vatNote');
  // Re-render found items with new language placeholders
  if (found.length > 0) renderFound();
}

// ── УТИЛИТЫ ───────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setStatus(msg, cls='info') {
  const el=$('st'); el.textContent=msg; el.className='status '+cls;
}
function setProgress(pct) {
  $('prog').style.display = pct>0?'block':'none';
  $('bar').style.width = pct+'%';
}
function bytesToBase64(bytes) {
  let bin=''; const chunk=8192;
  for (let i=0; i<bytes.length; i+=chunk)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));
  return btoa(bin);
}
function decodeB64(b64) {
  const bin=atob(b64);
  const arr=new Uint8Array(bin.length);
  for (let i=0; i<bin.length; i++) arr[i]=bin.charCodeAt(i)&0xff;
  return arr;
}
function parseArticles(raw) {
  return [...new Set(raw.split(/[\s,;]+/).map(s=>s.trim().toUpperCase().replace(/\s+/g,'')).filter(Boolean))];
}
function tileUrl(article) {
  const art=article.toUpperCase();
  const isTile=/^\d/.test(art)||/^KM\d/.test(art)||/^KMB|^KMD/.test(art);
  return 'https://kerama-marazzi.com/catalog/'+(isTile?'ceramic_tile':'gres')+'/'+art.toLowerCase()+'/';
}

// ── ЗАГРУЗКА КАТАЛОГА ─────────────────────────────────────────────────────
async function loadCatalog() {
  if (catalog.length>0) return;
  try {
    const cached=JSON.parse(localStorage.getItem('km_catalog')||'null');
    if (cached && Date.now()-cached.ts<86400000) { catalog=cached.data; return; }
  } catch(e) {}
  const r=await fetch(SCRIPT_URL+'?action=tiles',{redirect:'follow'});
  if (!r.ok) throw new Error('HTTP '+r.status);
  const data=await r.json();
  catalog=data.tiles||data;
  if (!Array.isArray(catalog)) throw new Error('Неверный формат tiles.json');
  try { localStorage.setItem('km_catalog',JSON.stringify({data:catalog,ts:Date.now()})); } catch(e){}
}

// ── ЗАПРОС К APPS SCRIPT ──────────────────────────────────────────────────
async function gas(params) {
  const url=SCRIPT_URL+'?'+new URLSearchParams(params).toString();
  const r=await fetch(url,{redirect:'follow'});
  if (!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}

// ── ЗАГРУЗКА ИЗОБРАЖЕНИЯ ──────────────────────────────────────────────────
function getJpgName(tile) {
  const list=tile.textures||[];
  const p=list.find(t=>t.toLowerCase().endsWith('.jpg'))||tile.texture_url||'';
  return p?p.split('/').pop():null;
}
async function fetchImg(tile) {
  const fname=getJpgName(tile);
  if (!fname) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url = SCRIPT_URL+'?'+new URLSearchParams({action:'img',file:fname}).toString();
    const r = await fetch(url, {redirect:'follow', signal: ctrl.signal});
    clearTimeout(timer);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.ok||!data.data) return null;
    return decodeB64(data.data);
  } catch(e) { return null; }
}

// ── ПРЕВЬЮ С ЦЕНАМИ ───────────────────────────────────────────────────────
function renderFound() {
  $('foundList').innerHTML=found.map((item, idx) => {
    const tt=item.tile, nm=tt.name||tt.collection||'—';
    const w=tt.width_mm, h=tt.height_mm;
    const sz=w&&h?w/10+'×'+h/10+'×'+(tt.thickness_mm||'?')+' см':'—';
    const img=item.imgBytes
      ?'<img class="fi-img" src="data:image/jpeg;base64,'+bytesToBase64(item.imgBytes)+'" alt="">'
      :'<div class="fi-ph">'+esc(tt.article.slice(0,5))+'</div>';
    const priceVal = item.price || '';
    return `<div class="fi">
      ${img}
      <div class="fi-info">
        <div class="fi-art">${esc(tt.article)}</div>
        <div class="fi-name">${esc(nm)}</div>
        <div class="fi-size">${sz}</div>
      </div>
      <div class="fi-price">
        <input type="number" min="0" step="1" placeholder="${t('pricePh')}"
               value="${priceVal}" data-idx="${idx}"
               oninput="found[${idx}].price=this.value">
        <div class="fi-price-label">${t('priceLabel')}</div>
      </div>
    </div>`;
  }).join('');
  // Кнопка PDF после списка
  $('foundList').innerHTML += `<button class="btn" id="btnPdf" style="margin-top:14px;background:#1F3864;">${t('pdfBtn')}</button>`;
}

// ── КНОПКА ────────────────────────────────────────────────────────────────
$('btn').addEventListener('click', async () => {
  const raw = $('arts').value.trim();
  if (!raw) return setStatus(t('errEmpty'),'err');
  $('btn').disabled=true;
  $('found').style.display='none';
  setProgress(1);
  try {
    setStatus(t('loadingCat'));
    await loadCatalog();
    setProgress(20);

    const articles=parseArticles(raw);
    found=[];
    const notFound=[];
    for (const art of articles) {
      const tile=catalog.find(t=>t.article.toUpperCase()===art);
      tile?found.push({tile,imgBytes:null,price:''}):notFound.push(art);
    }
    if (!found.length) {
      setStatus(t('errNone')(notFound),'err');
      setProgress(0); $('btn').disabled=false; return;
    }
    setProgress(30);

    setStatus(t('foundN')(found.length));
    let done=0;
    // Грузим все картинки параллельно (до 10 одновременно)
    const BATCH=10;
    for (let i=0; i<found.length; i+=BATCH) {
      await Promise.all(found.slice(i,i+BATCH).map(async item=>{
        item.imgBytes=await fetchImg(item.tile); done++;
        setProgress(30+Math.round(done/found.length*50));
      }));
    }

    renderFound();
    $('found').style.display='block';
    setProgress(100);

    let msg = t('doneN')(found.length, notFound);
    setStatus(msg + ' ' + t('hintPrices'), 'ok');
  } catch(e) {
    setStatus('Ошибка: '+e.message,'err'); console.error(e);
  }
  setProgress(0); $('btn').disabled=false;
});

// ── КНОПКА PDF ────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.id === 'btnPdf') generatePdf(found);
});

// ── ГЕНЕРАЦИЯ PDF (html2canvas → jsPDF, автоскачивание) ───────────────────
async function generatePdf(items) {
  // Проверяем загрузку библиотек
  if (typeof html2canvas === 'undefined') {
    setStatus('Ошибка: html2canvas не загружен. Проверьте интернет и перезагрузите страницу.', 'err');
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    setStatus('Ошибка: jsPDF не загружен. Проверьте интернет и перезагрузите страницу.', 'err');
    return;
  }
  setStatus(t('creating'), 'info');
  $('btnPdf').disabled = true;

  const dateStr = new Date().toLocaleDateString(
    currentLang==='kz'?'kk-KZ':'ru-RU',
    {year:'numeric',month:'long',day:'numeric'}
  );

  // Собираем строки таблицы
  let rows = '';
  for (let i=0; i<items.length; i++) {
    const it=items[i], tt=it.tile;
    const nm=tt.name||tt.collection||'';
    const w=tt.width_mm, h=tt.height_mm;
    const sz=w&&h?`${w/10}\u00D7${h/10}\u00D7${tt.thickness_mm||'?'} см`:'—';
    const bg=i%2===0?'#fff':'#f7f8fc';
    const priceVal=it.price
      ? Number(it.price).toLocaleString('ru-RU')+' \u20B8/м\u00B2'
      : t('pdfNoPrice');

    let imgCell='';
    if (it.imgBytes) {
      const b64=bytesToBase64(it.imgBytes);
      imgCell=`<img src="data:image/jpeg;base64,${b64}"
        style="width:70px;height:70px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">`;
    } else {
      imgCell=`<div style="width:70px;height:70px;background:#eee;border-radius:4px;
        display:inline-flex;align-items:center;justify-content:center;
        font-size:9px;color:#bbb;">${esc(tt.article.slice(0,6))}</div>`;
    }

    rows+=`<tr style="background:${bg};">
      <td style="padding:10px 8px;vertical-align:top;font-weight:700;color:#00b5d9;text-align:center;">${i+1}</td>
      <td style="padding:10px 8px;vertical-align:top;">
        <div style="font-weight:700;color:#00b5d9;font-size:15px;">${esc(tt.article)}</div>
        <div style="color:#555;font-size:13px;margin-top:3px;">${esc(nm)}</div>
        <div style="color:#aaa;font-size:12px;margin-top:3px;">${sz}</div>
      </td>
      <td style="padding:10px 8px;text-align:center;vertical-align:middle;">${imgCell}</td>
      <td style="padding:10px 8px;text-align:right;vertical-align:middle;
        font-weight:700;font-size:15px;color:#1F3864;white-space:nowrap;">${priceVal}</td>
    </tr>`;
  }

  // Итого
  let totalHtml='';
  const withPrice=items.filter(it=>it.price&&Number(it.price)>0);
  if (withPrice.length>0) {
    const total=withPrice.reduce((s,it)=>s+Number(it.price),0);
    totalHtml=`<div style="text-align:right;margin-top:16px;font-size:17px;font-weight:700;color:#1F3864;">
      ${currentLang==='kz'?'Барлығы':'Итого'}: ${total.toLocaleString('ru-RU')} \u20B8/м\u00B2
    </div>`;
  }

  const colProduct=currentLang==='kz'?'Өнім':'Продукция';
  const colPhoto=currentLang==='kz'?'Сурет':'Фото';
  const colPrice=currentLang==='kz'?'Баға':'Цена';

  // Контейнер 794px ширина = A4 при 96dpi
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;padding:40px 50px;background:#fff;font-family:Arial,sans-serif;color:#333;';
  container.innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:13px;color:#7a8fb0;letter-spacing:1px;margin-bottom:6px;">KERAMA MARAZZI · Kazakhstan</div>
      <div style="font-size:20px;font-weight:700;color:#1F3864;">${t('pdfTitle')}</div>
      <div style="font-size:12px;color:#999;margin-top:8px;">${t('pdfDate')} ${dateStr}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#00b5d9;color:#fff;">
        <th style="padding:10px 8px;text-align:center;width:6%;font-size:13px;">№</th>
        <th style="padding:10px 8px;text-align:left;width:48%;font-size:13px;">${colProduct}</th>
        <th style="padding:10px 8px;text-align:center;width:18%;font-size:13px;">${colPhoto}</th>
        <th style="padding:10px 8px;text-align:right;width:28%;font-size:13px;">${colPrice} (\u20B8)</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalHtml}
    <div style="margin-top:24px;font-size:11px;color:#999;border-top:1px solid #e0e0e0;padding-top:12px;">
      ${t('pdfVat')}
    </div>`;
  document.body.appendChild(container);

  try {
    // Ждём загрузку base64-картинок
    const imgs = container.querySelectorAll('img');
    await Promise.all([...imgs].map(img => img.complete ? Promise.resolve() :
      new Promise(r => { img.onload=r; img.onerror=r; })
    ));

    // html2canvas → canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // jsPDF: разбиваем canvas на страницы A4
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfW = 210, pdfH = 297;
    const imgW = pdfW;
    const imgH = canvas.height * pdfW / canvas.width;

    // Если контент больше одной страницы — нарезаем
    let position = 0;
    let pageNum = 0;
    while (position < imgH) {
      if (pageNum > 0) pdf.addPage();

      // Вырезаем кусок canvas под одну страницу
      const sliceH = Math.min(pdfH, imgH - position);
      const srcH = Math.round(sliceH * canvas.width / pdfW);
      const srcY = Math.round(position * canvas.width / pdfW);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(sliceData, 'JPEG', 0, 0, pdfW, sliceH);

      position += pdfH;
      pageNum++;
    }

    // Скачиваем
    const fileName = 'КП_KM_KZ_' + new Date().toLocaleDateString('ru').replace(/\./g,'-') + '.pdf';
    pdf.save(fileName);
    setStatus('✓ PDF ' + (currentLang==='kz'?'жүктелді!':'скачан!'), 'ok');
  } catch(err) {
    console.error(err);
    setStatus('Ошибка PDF: ' + err.message, 'err');
  } finally {
    document.body.removeChild(container);
    $('btnPdf').disabled = false;
  }
}
