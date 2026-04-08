// ═══════════════════════════════════════════════════════════════
// КП Generator — Google Apps Script прокси v2.3
// Вставить на script.google.com, развернуть как веб-приложение
// action=tiles  — каталог плитки
// action=img    — изображение по имени файла
// action=list   — список файлов в папке
// action=upload — загрузка файла (POST)
// action=log_visit — логирование визита (POST, авто-создание таблицы)
// ═══════════════════════════════════════════════════════════════

const FOLDER_ID    = '1N5Hv555IE1VR560jbKoihDIVpdUBEj7Q';
const JSON_FILE_ID = '1tYWG1l43q14AuPwMXLoHbZDzsN-hcnVC';
const CACHE        = CacheService.getScriptCache();
const CACHE_TTL    = 21600;

function doGet(e) {
  try {
    const action = (e.parameter.action || 'ping').trim();

    if (action === 'ping') return ok({ pong: true });

    if (action === 'tiles') {
      // Загружаем tiles_v2.json из основной папки (исправленные артикулы)
      const folder = DriveApp.getFolderById(FOLDER_ID);
      let it = folder.getFilesByName('tiles_v2.json');
      if (!it.hasNext()) it = folder.getFilesByName('tiles.json');
      if (!it.hasNext()) return err('tiles.json not found in folder');
      const content = it.next().getBlob().getDataAsString('utf-8');
      return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'img') {
      const fname = (e.parameter.file || '').trim();
      if (!fname) return err('file required');
      const fileId = findFileId(fname);
      if (!fileId) return err('not found: ' + fname);
      const blob = DriveApp.getFileById(fileId).getBlob();
      return ok({ data: Utilities.base64Encode(blob.getBytes()), mime: blob.getContentType() });
    }

    if (action === 'imgs') {
      const raw = (e.parameter.files || '').trim();
      if (!raw) return err('files required');
      const names = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      if (names.length > 30) return err('max 30 files per batch');
      var results = {};
      for (var i = 0; i < names.length; i++) {
        var fname = names[i];
        var fileId = findFileId(fname);
        if (fileId) {
          try {
            var blob = DriveApp.getFileById(fileId).getBlob();
            results[fname] = Utilities.base64Encode(blob.getBytes());
          } catch(ex) {
            results[fname] = null;
          }
        } else {
          results[fname] = null;
        }
      }
      return ok({ images: results });
    }

    if (action === 'list') {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const files = folder.getFiles();
      const names = [];
      while (files.hasNext()) {
        names.push(files.next().getName());
      }
      return ok({ count: names.length, files: names });
    }

    if (action === 'filemap') {
      const cacheKey = 'filemap_v1';
      const cached = CACHE.get(cacheKey);
      if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const files = folder.getFiles();
      var map = {};
      while (files.hasNext()) {
        var f = files.next();
        var nm = f.getName().toLowerCase();
        if (nm.endsWith('.jpg') || nm.endsWith('.jpeg') || nm.endsWith('.png')) {
          map[f.getName()] = f.getId();
        }
      }
      var json = JSON.stringify({ok:true, map:map});
      try { CACHE.put(cacheKey, json, CACHE_TTL); } catch(e) {}
      return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
    }

    return err('unknown action: ' + action);
  } catch (e) {
    return err(e.message);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';

    if (action === 'upload') {
      const fname = (body.name || '').trim();
      const b64   = body.data || '';
      if (!fname || !b64) return err('name and data required');

      const folder = DriveApp.getFolderById(FOLDER_ID);
      const existing = folder.getFilesByName(fname);
      if (existing.hasNext()) return ok({ status: 'exists', name: fname });

      const bytes = Utilities.base64Decode(b64);
      const blob  = Utilities.newBlob(bytes, 'image/jpeg', fname);
      const file  = folder.createFile(blob);
      CACHE.remove('fid_' + fname.toLowerCase());
      return ok({ status: 'uploaded', name: fname, id: file.getId() });
    }

    if (action === 'log_visit') {
      const sheet = getOrCreateVisitsSheet_();
      const now   = Utilities.formatDate(new Date(), 'Asia/Almaty', 'dd.MM.yyyy HH:mm:ss');
      sheet.appendRow([now, body.ip || '', body.country || '', body.region || '', body.city || '']);
      return ok({ status: 'logged' });
    }

    return err('unknown POST action: ' + action);
  } catch (e) {
    return err(e.message);
  }
}

// ── Авто-создание таблицы логов визитов ──────────────────────────────────
function getOrCreateVisitsSheet_() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('VISITS_SS_ID');

  // Если таблица уже создана — открываем
  if (ssId) {
    try {
      const ss = SpreadsheetApp.openById(ssId);
      return ss.getSheetByName('Визиты') || ss.insertSheet('Визиты');
    } catch(e) {
      // Таблица удалена — создадим заново
      props.deleteProperty('VISITS_SS_ID');
    }
  }

  // Создаём новую таблицу в той же папке
  const ss = SpreadsheetApp.create('КП KZ — Логи визитов');
  const file = DriveApp.getFileById(ss.getId());
  const folder = DriveApp.getFolderById(FOLDER_ID);
  folder.addFile(file);
  // Убираем из корня Моего диска
  const root = DriveApp.getRootFolder();
  root.removeFile(file);

  // Сохраняем ID в свойства скрипта
  props.setProperty('VISITS_SS_ID', ss.getId());

  // Настраиваем лист
  const sheet = ss.getActiveSheet();
  sheet.setName('Визиты');
  sheet.appendRow(['Дата/Время', 'IP', 'Страна', 'Регион', 'Город']);
  sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 150);

  return sheet;
}

function findFileId(fname) {
  const key    = 'fid_' + fname.toLowerCase();
  const cached = CACHE.get(key);
  if (cached) return cached === 'null' ? null : cached;

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const it = folder.getFilesByName(fname);
  if (it.hasNext()) {
    const id = it.next().getId();
    CACHE.put(key, id, CACHE_TTL);
    return id;
  }
  return null;
}

function ok(obj)  { obj.ok = true;  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function err(msg) { return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg })).setMimeType(ContentService.MimeType.JSON); }
