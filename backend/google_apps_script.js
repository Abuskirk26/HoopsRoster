const SHEET_ROSTER = "Roster";
const SHEET_LOGS = "Audit_Logs";
const SHEET_HISTORY = "Game_History";
const SHEET_SCORE = "Current_Score";
const SHEET_SETTINGS = "Settings";

const DEFAULT_MAX_PLAYERS = 12;
const SETTINGS_KEY_MAX_PLAYERS = "maxPlayers";
const SETTINGS_KEY_ANNOUNCEMENT = "announcement";

function getOrCreateSettingsSheet(ss) {
  let settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEET_SETTINGS);
    settingsSheet.appendRow(["Key", "Value"]);
    settingsSheet.setFrozenRows(1);
  }
  return settingsSheet;
}

function getSetting(settingsSheet, key, defaultValue) {
  const data = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      const asNumber = Number(data[i][1]);
      return isNaN(asNumber) ? defaultValue : asNumber;
    }
  }
  return defaultValue;
}

function getSettingText(settingsSheet, key, defaultValue) {
  const data = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      const value = data[i][1];
      return value === null || value === undefined ? defaultValue : String(value);
    }
  }
  return defaultValue;
}

function setSetting(settingsSheet, key, value) {
  const data = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      settingsSheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  settingsSheet.appendRow([key, value]);
}

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;
    if (action === 'GET_SCORE') {
       let scoreSheet = ss.getSheetByName(SHEET_SCORE);
       if (!scoreSheet) return successResponse({ scoreA: 0, scoreB: 0 });
       const data = scoreSheet.getDataRange().getValues();
       if (data.length > 1) return successResponse({ scoreA: Number(data[1][0]), scoreB: Number(data[1][1]) });
       return successResponse({ scoreA: 0, scoreB: 0 });
    }
    if (action === 'GET_STATS') {
       let historySheet = ss.getSheetByName(SHEET_HISTORY);
       let rosterSheet = ss.getSheetByName(SHEET_ROSTER);
       if (!historySheet || !rosterSheet) return successResponse({ stats: [] });
       const rosterData = rosterSheet.getDataRange().getValues();
       const playerMap = {};
       for(let i=1; i<rosterData.length; i++) { playerMap[String(rosterData[i][0])] = { name: rosterData[i][1], tier: Number(rosterData[i][2]) }; }
       const historyData = historySheet.getDataRange().getValues();
       const stats = {};
       for(let i=1; i<historyData.length; i++) {
          try { const playerIds = JSON.parse(historyData[i][1]); if (Array.isArray(playerIds)) { playerIds.forEach(id => { stats[id] = (stats[id] || 0) + 1; }); } } catch(err) {}
       }
       const result = Object.keys(playerMap).map(id => ({ id: id, name: playerMap[id].name, tier: playerMap[id].tier, gamesPlayed: stats[id] || 0 })).sort((a,b) => b.gamesPlayed - a.gamesPlayed);
       return successResponse({ stats: result });
    }
    let rosterSheet = ss.getSheetByName(SHEET_ROSTER);
    if (!rosterSheet) { rosterSheet = ss.insertSheet(SHEET_ROSTER); rosterSheet.appendRow(["ID", "Name", "Tier", "Status", "Phone", "Timestamp", "IsAdmin", "Email", "PIN"]); rosterSheet.setFrozenRows(1); }
    const headers = rosterSheet.getRange(1, 1, 1, rosterSheet.getLastColumn()).getValues()[0];
    let emailIdx = headers.indexOf("Email"); if (emailIdx === -1) { rosterSheet.getRange(1, headers.length + 1).setValue("Email"); emailIdx = headers.length; }
    let pinIdx = headers.indexOf("PIN"); if (pinIdx === -1) { const nextCol = rosterSheet.getLastColumn() + 1; rosterSheet.getRange(1, nextCol).setValue("PIN"); pinIdx = nextCol - 1; }
    const data = rosterSheet.getDataRange().getValues();
    const currentHeaders = rosterSheet.getRange(1, 1, 1, rosterSheet.getLastColumn()).getValues()[0];
    const eIdx = currentHeaders.indexOf("Email");
    const pIdx = currentHeaders.indexOf("PIN");
    const rows = data.slice(1);
    const players = rows.map(row => { return { id: String(row[0]), name: row[1], tier: Number(row[2]), status: row[3], phoneNumber: row[4], timestamp: row[5] ? new Date(row[5]).getTime() : null, isAdmin: row[6] === true || row[6] === "true", email: (eIdx > -1 && row[eIdx]) ? row[eIdx] : "", pin: (pIdx > -1 && row[pIdx]) ? String(row[pIdx]) : "" }; });
    const settingsSheet = getOrCreateSettingsSheet(ss);
    const maxPlayers = getSetting(settingsSheet, SETTINGS_KEY_MAX_PLAYERS, DEFAULT_MAX_PLAYERS);
    const announcement = getSettingText(settingsSheet, SETTINGS_KEY_ANNOUNCEMENT, "");
    return successResponse({ data: players, maxPlayers: maxPlayers, announcement: announcement });
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON); } finally { lock.releaseLock(); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) { logSheet = ss.insertSheet(SHEET_LOGS); logSheet.appendRow(["Timestamp", "Action", "Actor", "Details"]); }
    let rosterSheet = ss.getSheetByName(SHEET_ROSTER);
    if (!rosterSheet) { rosterSheet = ss.insertSheet(SHEET_ROSTER); rosterSheet.appendRow(["ID", "Name", "Tier", "Status", "Phone", "Timestamp", "IsAdmin", "Email", "PIN"]); }
    const settingsSheet = getOrCreateSettingsSheet(ss);
    const getHeaderMap = () => {
      const headers = rosterSheet.getRange(1, 1, 1, rosterSheet.getLastColumn()).getValues()[0];
      return { name: headers.indexOf("Name") + 1, tier: headers.indexOf("Tier") + 1, status: headers.indexOf("Status") + 1, phone: headers.indexOf("Phone") + 1, ts: headers.indexOf("Timestamp") + 1, admin: headers.indexOf("IsAdmin") + 1, email: headers.indexOf("Email") + 1, pin: headers.indexOf("PIN") + 1 };
    };
    const getRowIndex = (id) => { const data = rosterSheet.getDataRange().getValues(); for (let i = 1; i < data.length; i++) { if (String(data[i][0]) === String(id)) return i + 1; } return -1; };
    if (action === 'UPDATE_SCORE') {
      let scoreSheet = ss.getSheetByName(SHEET_SCORE);
      if (!scoreSheet) { scoreSheet = ss.insertSheet(SHEET_SCORE); scoreSheet.appendRow(["TeamA_Score", "TeamB_Score", "Last_Updated"]); scoreSheet.appendRow([0, 0, new Date()]); }
      if (scoreSheet.getLastRow() < 2) { scoreSheet.appendRow([0, 0, new Date()]); }
      scoreSheet.getRange(2, 1).setValue(payload.scoreA); scoreSheet.getRange(2, 2).setValue(payload.scoreB); scoreSheet.getRange(2, 3).setValue(new Date());
      return successResponse({ message: "Score Updated" });
    }
    if (action === 'INITIALIZE_OR_SYNC') {
      if (rosterSheet.getLastRow() <= 1) { const players = payload.players; players.forEach(p => { rosterSheet.appendRow([p.id, p.name, p.tier, p.status, p.phoneNumber, p.timestamp ? new Date(p.timestamp).toISOString() : "", p.isAdmin, p.email || "", p.pin || ""]); }); logAction(logSheet, "INITIALIZE", payload.actor, "Populated roster"); }
      return successResponse({ message: "Synced" });
    }
    if (action === 'UPDATE_STATUS') {
      const idx = getRowIndex(payload.id); const map = getHeaderMap();
      if (idx > -1) { rosterSheet.getRange(idx, map.status).setValue(payload.status); rosterSheet.getRange(idx, map.ts).setValue(new Date(payload.timestamp).toISOString()); logAction(logSheet, "UPDATE_STATUS", payload.actor, `Set ID ${payload.id} to ${payload.status}`); }
      return successResponse({ message: "Updated" });
    }
    if (action === 'CREATE_PLAYER') {
       const p = payload.player;
       if (getRowIndex(p.id) === -1) { rosterSheet.appendRow([p.id, p.name, p.tier, p.status, p.phoneNumber, p.timestamp ? new Date(p.timestamp).toISOString() : "", p.isAdmin, p.email || "", p.pin || ""]); logAction(logSheet, "CREATE_PLAYER", payload.actor, `Created ${p.name}`); }
       return successResponse({ message: "Created" });
    }
    if (action === 'UPDATE_PLAYER_DETAILS') {
      const idx = getRowIndex(payload.id); const p = payload.player; const map = getHeaderMap();
      if (idx > -1) { rosterSheet.getRange(idx, map.name).setValue(p.name); rosterSheet.getRange(idx, map.tier).setValue(p.tier); rosterSheet.getRange(idx, map.phone).setValue(p.phoneNumber); if (map.email > 0) rosterSheet.getRange(idx, map.email).setValue(p.email || ""); if (map.pin > 0 && p.pin) rosterSheet.getRange(idx, map.pin).setValue(p.pin); if (map.admin > 0) rosterSheet.getRange(idx, map.admin).setValue(p.isAdmin); logAction(logSheet, "UPDATE_DETAILS", payload.actor, `Updated details for ${p.name}`); }
      return successResponse({ message: "Updated Details" });
    }
    if (action === 'DELETE_PLAYER') {
       const idx = getRowIndex(payload.id); if (idx > -1) { const name = rosterSheet.getRange(idx, 2).getValue(); rosterSheet.deleteRow(idx); logAction(logSheet, "DELETE_PLAYER", payload.actor, `Deleted user: ${name} (ID: ${payload.id})`); }
       return successResponse({ message: "Deleted" });
    }
    if (action === 'RESET_WEEK') {
       if (payload.shouldArchive) {
         let historySheet = ss.getSheetByName(SHEET_HISTORY); if (!historySheet) { historySheet = ss.insertSheet(SHEET_HISTORY); historySheet.appendRow(["Date", "PlayerIDs_JSON", "PlayerNames_Readable"]); }
         const data = rosterSheet.getDataRange().getValues(); const inPlayerIds = []; const inPlayerNames = []; const map = getHeaderMap();
         for(let i=1; i<data.length; i++) { if (data[i][map.status - 1] === 'IN') { inPlayerIds.push(data[i][0]); inPlayerNames.push(data[i][1]); } }
         if (inPlayerIds.length > 0) { historySheet.appendRow([new Date(), JSON.stringify(inPlayerIds), inPlayerNames.join(", ")]); }
       }
       const map = getHeaderMap(); const range = rosterSheet.getDataRange(); const numRows = range.getNumRows();
       if (numRows > 1) { rosterSheet.getRange(2, map.status, numRows - 1, 1).setValue("UNKNOWN"); rosterSheet.getRange(2, map.ts, numRows - 1, 1).setValue(""); }
       logAction(logSheet, "RESET_WEEK", payload.actor, payload.shouldArchive ? "Reset and Archived" : "Reset without Archive");
       return successResponse({ message: "Reset Complete" });
    }
    if (action === 'UPDATE_SETTINGS') {
      let nextMaxPlayers = null;
      if (payload.maxPlayers !== undefined && payload.maxPlayers !== null) {
        const parsedMaxPlayers = Number(payload.maxPlayers);
        nextMaxPlayers = Math.max(1, Math.min(50, isNaN(parsedMaxPlayers) ? DEFAULT_MAX_PLAYERS : Math.floor(parsedMaxPlayers)));
        setSetting(settingsSheet, SETTINGS_KEY_MAX_PLAYERS, nextMaxPlayers);
      }

      let nextAnnouncement = null;
      if (payload.announcement !== undefined) {
        nextAnnouncement = payload.announcement === null ? "" : String(payload.announcement);
        setSetting(settingsSheet, SETTINGS_KEY_ANNOUNCEMENT, nextAnnouncement);
      }

      const parts = [];
      if (nextMaxPlayers !== null) parts.push(`maxPlayers=${nextMaxPlayers}`);
      if (nextAnnouncement !== null) parts.push(`announcement=${nextAnnouncement ? "set" : "cleared"}`);
      logAction(logSheet, "UPDATE_SETTINGS", payload.actor, parts.length ? `Updated ${parts.join(", ")}` : "No settings updated");

      const effectiveMaxPlayers = nextMaxPlayers !== null ? nextMaxPlayers : getSetting(settingsSheet, SETTINGS_KEY_MAX_PLAYERS, DEFAULT_MAX_PLAYERS);
      const effectiveAnnouncement = nextAnnouncement !== null ? nextAnnouncement : getSettingText(settingsSheet, SETTINGS_KEY_ANNOUNCEMENT, "");
      return successResponse({ message: "Settings Updated", maxPlayers: effectiveMaxPlayers, announcement: effectiveAnnouncement });
    }
    return successResponse({ message: "Unknown Action" });
  } catch (e) { return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON); } finally { lock.releaseLock(); }
}

function logAction(sheet, action, actor, details) { sheet.appendRow([new Date(), action, actor || "Unknown", details]); }
function successResponse(data) { return ContentService.createTextOutput(JSON.stringify({ status: 'success', ...data })).setMimeType(ContentService.MimeType.JSON); }
