import { saveAs } from 'file-saver';

const columns = [
  ['id', 'Identifiant', 38], ['nom', 'Nom', 20], ['prenoms', 'Prénoms', 26], ['sexe', 'Sexe', 12],
  ['date_naissance', 'Date de naissance', 19], ['promotion', 'Promotion', 16], ['telephone', 'Téléphone', 20], ['email', 'Email', 30],
  ['adresse', 'Adresse (pays et ville)', 32], ['niveau', 'Niveau d’étude', 20],
  ['etablissement', 'Établissement', 30], ['photo_url', 'Portrait (URL)', 38], ['created_at', 'Date d’inscription', 23],
];

export async function exportInscriptions(rows) {
  const exportedAt = new Date();
  const escapeXml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const columnLetter = number => {
    let value = number;
    let output = '';
    while (value > 0) { const remainder = (value - 1) % 26; output = String.fromCharCode(65 + remainder) + output; value = Math.floor((value - 1) / 26); }
    return output;
  };
  const cell = (reference, value, style = 0) => `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  const sheetRows = [];
  sheetRows.push(`<row r="1" ht="34" customHeight="1">${cell('A1', 'REGISTRE DES INSCRIPTIONS', 1)}</row>`);
  sheetRows.push(`<row r="2" ht="22" customHeight="1">${cell('A2', `Exporté le ${exportedAt.toLocaleString('fr-FR')}`, 2)}</row>`);
  sheetRows.push('<row r="3"/>');
  sheetRows.push(`<row r="4" ht="24" customHeight="1">${columns.map(([, label], index) => cell(`${columnLetter(index + 1)}4`, label, 3)).join('')}</row>`);
  rows.forEach((record, index) => {
    const rowNum = index + 5;
    sheetRows.push(`<row r="${rowNum}">${columns.map(([key], colIndex) => cell(`${columnLetter(colIndex + 1)}${rowNum}`, record[key] ?? '', rowNum % 2 === 0 ? 4 : 0)).join('')}</row>`);
  });
  const widths = columns.map(([, , width], index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
  const lastCell = `${columnLetter(columns.length)}${Math.max(4, rows.length + 4)}`;
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sheetRows.join('')}</sheetData><autoFilter ref="A4:${lastCell}"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><i/><sz val="10"/><color rgb="FF506078"/><name val="Aptos"/></font><font><b/><sz val="10"/><color rgb="FF002357"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF002357"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC700"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="1" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>`;
  const zip = new Uint8Array(await createZip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inscriptions" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/worksheets/sheet1.xml', worksheet], ['xl/styles.xml', styles],
  ]));
  saveAs(new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `inscriptions_${exportedAt.toISOString().slice(0, 10).replaceAll('-', '_')}.xlsx`);
}

async function createZip(files) {
  const encoder = new TextEncoder();
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc32 = data => { let crc = 0xffffffff; for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
  const chunks = [];
  const central = [];
  let localOffset = 0;
  const write16 = (view, offset, value) => view.setUint16(offset, value, true);
  const write32 = (view, offset, value) => view.setUint32(offset, value, true);
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    write32(lv, 0, 0x04034b50); write16(lv, 4, 20); write16(lv, 6, 0x0800); write16(lv, 8, 0); write32(lv, 14, crc); write32(lv, 18, data.length); write32(lv, 22, data.length); write16(lv, 26, nameBytes.length); write16(lv, 28, 0);
    local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); chunks.push(local);
    const record = new Uint8Array(46 + nameBytes.length); const cv = new DataView(record.buffer);
    write32(cv, 0, 0x02014b50); write16(cv, 4, 20); write16(cv, 6, 20); write16(cv, 8, 0x0800); write16(cv, 10, 0); write32(cv, 16, crc); write32(cv, 20, data.length); write32(cv, 24, data.length); write16(cv, 28, nameBytes.length); write16(cv, 30, 0); write16(cv, 32, 0); write16(cv, 34, 0); write16(cv, 36, 0); write32(cv, 38, 0); write32(cv, 42, localOffset);
    record.set(nameBytes, 46); central.push(record); localOffset += local.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  write32(ev, 0, 0x06054b50); write16(ev, 8, files.length); write16(ev, 10, files.length); write32(ev, 12, centralSize); write32(ev, 16, localOffset); write16(ev, 20, 0);
  return new Blob([...chunks, ...central, end]).arrayBuffer();
}
