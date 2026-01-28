
/**
 * ARIAL MEDICINA LABORAL - BACKEND CORE v3.8
 * Implementación robusta para nueva URL de producción.
 */

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'getData') {
    var responseData = getData();
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var request;
  try {
    request = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Invalid JSON format"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = request.action;
  var payload = request.payload;
  var result = { status: "error", message: "Action not recognized" };

  if (action === 'savePatient') result = saveRow("pacientes", payload, ["dni", "nombre", "apellido"]);
  if (action === 'saveCase') result = saveRow("casos", payload, ["patientId", "status", "evolutions"]);
  if (action === 'deleteCase') result = deleteRow("casos", payload.id);
  if (action === 'saveUser') result = saveRow("usuarios", payload, ["username", "password", "fullName"]);
  if (action === 'deleteUser') result = deleteRow("usuarios", payload.id);
  if (action === 'saveCompany') result = saveRow("empresas", payload, ["name", "cuit"]);
  if (action === 'deleteCompany') result = deleteRow("empresas", payload.id);

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getData() {
  try {
    var patients = getSheetData("pacientes", ["dni", "nombre", "apellido"]);
    var users = getSheetData("usuarios", ["username", "password", "role"]);
    var companies = getSheetData("empresas", ["name", "cuit"]);
    var rawCases = getSheetData("casos", ["status", "evolutions"]);

    var cases = rawCases.map(function(c) {
      try {
        c.evolutions = typeof c.evolutions === 'string' ? JSON.parse(c.evolutions) : (c.evolutions || []);
      } catch(e) {
        c.evolutions = [];
      }
      return c;
    });

    return {
      status: 'success',
      patients: patients,
      cases: cases,
      users: users,
      companies: companies,
      timestamp: new Date().getTime()
    };
  } catch(e) {
    return { status: "error", message: "Error en backend: " + e.toString() };
  }
}

/**
 * Motor de búsqueda inteligente de hojas
 */
function getSheetSafe(name, requiredHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets();
  
  // Intento 1: Por nombre normalizado
  var normalizedSearch = name.toLowerCase().trim().replace(/\s/g, '');
  for (var i = 0; i < allSheets.length; i++) {
    var sName = allSheets[i].getName().toLowerCase().trim().replace(/\s/g, '');
    if (sName === normalizedSearch) return allSheets[i];
  }
  
  // Intento 2: Por contenido de encabezados (si falló el nombre)
  if (requiredHeaders && requiredHeaders.length > 0) {
    for (var i = 0; i < allSheets.length; i++) {
      var sheet = allSheets[i];
      var lastCol = Math.max(sheet.getLastColumn(), 1);
      var firstRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var headersInSheet = firstRow.map(function(h) { return String(h).toLowerCase().trim(); });
      
      var matches = requiredHeaders.every(function(req) {
        return headersInSheet.indexOf(req.toLowerCase()) !== -1;
      });
      if (matches) return sheet;
    }
  }
  
  return null;
}

function getSheetData(name, requiredHeaders) {
  var sheet = getSheetSafe(name, requiredHeaders);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; 
  
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    var hasContent = false;
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var value = data[i][j];
      var cleanValue = (value === null || value === undefined) ? "" : String(value).trim();
      obj[key] = cleanValue;
      if (cleanValue !== "") hasContent = true;
      
      // Alias de compatibilidad
      var lKey = key.toLowerCase();
      if (lKey === 'fullname' || lKey === 'nombrecompleto') obj['fullName'] = cleanValue;
      if (lKey === 'username' || lKey === 'usuario') obj['username'] = cleanValue;
      if (lKey === 'password' || lKey === 'contraseña') obj['password'] = cleanValue;
    }
    if (hasContent) result.push(obj);
  }
  return result;
}

function saveRow(sheetName, payload, requiredHeaders) {
  var sheet = getSheetSafe(sheetName, requiredHeaders);
  if (!sheet) return { status: "error", message: "Falta hoja: " + sheetName };
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var id = payload.id;

  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      rowIndex = i + 1;
      break;
    }
  }

  var row = headers.map(function(header) {
    var val = payload[header];
    if (val === undefined) {
      var norm = header.toLowerCase();
      if (norm === 'fullname') val = payload['fullName'];
      else if (norm === 'password') val = payload['password'];
      else val = payload[norm];
    }
    if (header.toLowerCase() === 'evolutions') return JSON.stringify(val || []);
    return val !== undefined && val !== null ? String(val) : "";
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { status: "success" };
}

function deleteRow(sheetName, id) {
  var sheet = getSheetSafe(sheetName);
  if (!sheet) return { status: "error" };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { status: "success" };
    }
  }
  return { status: "not_found" };
}
