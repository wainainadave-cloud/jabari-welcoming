const HEADERS = ['id', 'request_id', 'created_at', 'full_name', 'phone', 'attending', 'guests', 'note'];

// Run once from the editor of a script bound to the PRIVATE RSVP spreadsheet.
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Create this script through the private Sheet: Extensions > Apps Script.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', book.getId());
  let sheet = book.getSheetByName('RSVPs');
  if (!sheet) sheet = book.insertSheet('RSVPs');
  if (!sheet.getLastRow()) sheet.appendRow(HEADERS);
  assertHeaders_(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange('A:B').setNumberFormat('@');
  sheet.getRange('D:F').setNumberFormat('@');
  sheet.getRange('H:H').setNumberFormat('@');
}

function sheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Backend is not configured.');
  const sheet = SpreadsheetApp.openById(id).getSheetByName('RSVPs');
  if (!sheet) throw new Error('RSVP sheet is missing.');
  assertHeaders_(sheet);
  return sheet;
}

function assertHeaders_(sheet) {
  if (JSON.stringify(sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0]) !== JSON.stringify(HEADERS)) {
    throw new Error('Unexpected RSVP headers; refusing to change existing data.');
  }
}

function doGet() {
  return json_({ok:true, service:'Jabari RSVP', mpesaEnabled:false});
}

function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 6000) throw new Error('Invalid request.');
    const data = validate_(JSON.parse(e.postData.contents));
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sheet = sheet_();
      // The idempotency key stays the same when a response is lost and the guest retries.
      const existing = sheet.getLastRow() > 1 ? sheet.getRange(2,2,sheet.getLastRow()-1,1)
        .createTextFinder(data.requestId).matchEntireCell(true).findNext() : null;
      if (existing) return json_({ok:true,id:sheet.getRange(existing.getRow(),1).getValue(),duplicate:true});
      const cache = CacheService.getScriptCache();
      const rateKey = 'phone:' + data.phone;
      const count = Number(cache.get(rateKey) || 0);
      if (count >= 5) throw new Error('Too many responses for this phone. Please contact the family.');
      const id = Utilities.getUuid();
      const row = [id,data.requestId,new Date().toISOString(),safeCell_(data.name),data.phone,
        data.attending,data.guests,safeCell_(data.note)];
      sheet.appendRow(row);
      SpreadsheetApp.flush();
      if (sheet.getRange(sheet.getLastRow(),1).getValue() !== id) throw new Error('Could not verify save. Retry the same response.');
      cache.put(rateKey,String(count+1),600);
      return json_({ok:true,id});
    } finally { lock.releaseLock(); }
  } catch (err) {
    // Do not expose service errors or Sheet identifiers to anonymous visitors.
    const known = /Invalid|Enter|Choose|consent|Too many|Retry|configured/.test(String(err.message));
    return json_({ok:false,error:known ? err.message : 'Unable to save your RSVP. Please retry or contact the family.'});
  }
}

function validate_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid response.');
  const name = String(data.name || '').trim();
  const note = String(data.note || '').trim();
  let phone = String(data.phone || '').replace(/[\s()+-]/g,'');
  if (/^0[17]\d{8}$/.test(phone)) phone = '254'+phone.slice(1);
  if (/^[17]\d{8}$/.test(phone)) phone = '254'+phone;
  if (name.length < 2 || name.length > 100) throw new Error('Enter a name between 2 and 100 characters.');
  if (!/^254[17]\d{8}$/.test(phone)) throw new Error('Enter a valid Kenyan mobile number.');
  if (!['yes','no','maybe'].includes(data.attending)) throw new Error('Choose your attendance.');
  const guests = Number(data.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 20) throw new Error('Enter between 1 and 20 guests.');
  if (note.length > 1000) throw new Error('Enter a message under 1001 characters.');
  if (data.consent !== 'yes') throw new Error('Please give consent to save your RSVP.');
  if (!/^[a-f0-9-]{36}$/i.test(String(data.requestId))) throw new Error('Invalid request identifier.');
  if (data.website) throw new Error('Invalid request.');
  return {name,note,phone,attending:data.attending,guests:data.attending==='no'?0:guests,requestId:data.requestId};
}

function safeCell_(value) { return /^[\s]*[=+@-]/.test(value) ? "'"+value : value; }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Jabari Family').addItem('Open dashboard','openDashboard').addToUi();
}

// These are deliberately NOT web routes. The dialog runs only in the private Sheet.
function openDashboard() {
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('Dashboard')
    .setWidth(1200).setHeight(750),'Jabari Family Dashboard');
}

function getDashboardData() {
  // Anonymous web visitors cannot call this through ContentService.
  // Require an interactive, authenticated user who can open the private Sheet.
  const active = Session.getActiveUser().getEmail();
  if (!active) throw new Error('Open this dashboard from the private Google Sheet after signing in.');
  const sheet = sheet_();
  const values = sheet.getLastRow()>1 ? sheet.getRange(2,1,sheet.getLastRow()-1,HEADERS.length).getDisplayValues() : [];
  return values.map(row=>Object.fromEntries(HEADERS.map((h,i)=>[h,row[i]])));
}
