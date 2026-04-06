// ═══════════════════════════════════════════════════════════════
// КП Generator — Google Apps Script прокси v2
// Вставить на script.google.com, развернуть как веб-приложение
// НОВОЕ: action=list — список всех файлов в папке
//        action=upload — загрузка файла (base64) в папку
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
      const cacheKey = 'tiles_json';
      const cached   = CACHE.get(cacheKey);
      if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
      const content = DriveApp.getFileById(JSON_FILE_ID).getBlob().getDataAsString('utf-8');
      CACHE.put(cacheKey, content, CACHE_TTL);
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

    // НОВОЕ: список всех файлов в папке
    if (action === 'list') {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const files = folder.getFiles();
      const names = [];
      while (files.hasNext()) {
        names.push(files.next().getName());
      }
      return ok({ count: names.length, files: names });
    }

    return err('unknown action: ' + action);
  } catch (e) {
    return err(e.message);
  }
}

// НОВОЕ: загрузка файла через POST
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';

    if (action === 'upload') {
      const fname = (body.name || '').trim();
      const b64   = body.data || '';
      if (!fname || !b64) return err('name and data required');

      const folder = DriveApp.getFolderById(FOLDER_ID);
      // Проверяем — может уже есть
      const existing = folder.getFilesByName(fname);
      if (existing.hasNext()) return ok({ status: 'exists', name: fname });

      const bytes = Utilities.base64Decode(b64);
      const blob  = Utilities.newBlob(bytes, 'image/jpeg', fname);
      const file  = folder.createFile(blob);
      // Сбрасываем кэш поиска
      CACHE.remove('fid_' + fname.toLowerCase());
      return ok({ status: 'uploaded', name: fname, id: file.getId() });
    }

    return err('unknown POST action: ' + action);
  } catch (e) {
    return err(e.message);
  }
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
  // Не кэшируем отсутствие — файл может появиться позже
  return null;
}

function ok(obj)  { obj.ok = true;  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function err(msg) { return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg })).setMimeType(ContentService.MimeType.JSON); }
