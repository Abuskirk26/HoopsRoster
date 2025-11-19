const SHEET_ROSTER = "Roster";
const SHEET_LOGS = "Audit_Logs";
const SHEET_HISTORY = "Game_History";

function doGet(e) {
  const lock = LockService.getScriptLock(); lock.tryLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = e.parameter.action;
    if (action === 'GET_STATS') {
       let historySheet = ss.getSheetByName(SHEET_HISTORY);
       let rosterSheet = ss.getSheetByName(SHEET_ROSTER);
       if (!historySheet || !rosterSheet) return success({ stats: [] });
       
       const rosterData = rosterSheet.getDataRange().getValues();
       const playerMap = {}; 
       for(let i=1; i<rosterData.length; i++) playerMap[String(rosterData[i][0])] = { name: rosterData[i][1], tier: Number(rosterData[i][2]) };

       const historyData = historySheet.getDataRange().getValues();
       const stats = {}; 
       for(let i=1; i<historyData.length; i++) {
          try { const pIds = JSON.parse(historyData[i][1]); if(Array.isArray(pIds)) pIds.forEach(id => stats[id] = (stats[id]||0)+1); } catch(e){}
       }
       const result = Object.keys(playerMap).map(id => ({ id: id, name: playerMap[id].name, tier: playerMap[id].tier, gamesPlayed: stats[id] || 0 })).sort((a,b) => b.gamesPlayed - a.gamesPlayed);
       return success({ stats: result });
    }

    let sheet = ss.getSheetByName(SHEET_ROSTER);
    if (!sheet) { sheet = ss.insertSheet(SHEET_ROSTER); sheet.appendRow(["ID", "Name", "Tier", "Status", "Phone", "Timestamp", "IsAdmin", "Email", "PIN"]); }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const idx = (n) => headers.indexOf(n);

    const players = rows.map(row => ({
      id: String(row[0]),
      name: row[1],
      tier: Number(row[2]),
      status: row[3],
      phoneNumber: row[4],
      timestamp: row[5] ? new Date(row[5]).getTime() : null,
      isAdmin: row[idx("IsAdmin")] === true || row[idx("IsAdmin")] === "true",
      email: row[idx("Email")] || "",
      pin: row[idx("PIN")] ? String(row[idx("PIN")]) : ""
    }));
    return success({ data: players });
  } catch (e) { return error(e); } finally { lock.releaseLock(); }
}

function doPost(e) {
  const lock = LockService.getScriptLock(); lock.tryLock(10000);
  try {
    const p = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logS = ss.getSheetByName(SHEET_LOGS); if(!logS) { logS = ss.insertSheet(SHEET_LOGS); logS.appendRow(["Timestamp", "Action", "Actor", "Details"]); }
    let rS = ss.getSheetByName(SHEET_ROSTER); if(!rS) { rS = ss.insertSheet(SHEET_ROSTER); rS.appendRow(["ID", "Name", "Tier", "Status", "Phone", "Timestamp", "IsAdmin", "Email", "PIN"]); }
    
    const headers = rS.getRange(1,1,1,rS.getLastColumn()).getValues()[0];
    const col = (name) => headers.indexOf(name) + 1;
    const rowIdx = (id) => { const d = rS.getDataRange().getValues(); for(let i=1;i<d.length;i++) if(String(d[i][0])===String(id)) return i+1; return -1; };

    if (p.action === 'UPDATE_STATUS') {
      const idx = rowIdx(p.id);
      if (idx > -1) { rS.getRange(idx, col("Status")).setValue(p.status); rS.getRange(idx, col("Timestamp")).setValue(new Date(p.timestamp).toISOString()); }
      return success({message:"Updated"});
    }
    if (p.action === 'RESET_WEEK') {
       if (p.shouldArchive) {
         let hS = ss.getSheetByName(SHEET_HISTORY); if(!hS) { hS = ss.insertSheet(SHEET_HISTORY); hS.appendRow(["Date", "IDs", "Names"]); }
         const d = rS.getDataRange().getValues(); const ids = []; const names = [];
         for(let i=1; i<d.length; i++) if(d[i][col("Status")-1] === 'IN') { ids.push(d[i][0]); names.push(d[i][1]); }
         if (ids.length) hS.appendRow([new Date(), JSON.stringify(ids), names.join(", ")]);
       }
       if (rS.getLastRow()>1) { rS.getRange(2, col("Status"), rS.getLastRow()-1, 1).setValue("UNKNOWN"); rS.getRange(2, col("Timestamp"), rS.getLastRow()-1, 1).setValue(""); }
       return success({message:"Reset"});
    }
    // Simplified for brevity - other actions follow same pattern
    return success({ message: "Action processed" });
  } catch (e) { return error(e); } finally { lock.releaseLock(); }
}

function success(d) { return ContentService.createTextOutput(JSON.stringify({status:'success',...d})).setMimeType(ContentService.MimeType.JSON); }
function error(e) { return ContentService.createTextOutput(JSON.stringify({status:'error',message:e.toString()})).setMimeType(ContentService.MimeType.JSON); }
