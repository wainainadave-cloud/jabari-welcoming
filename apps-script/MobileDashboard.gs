// Run once from the bound editor. This adds a normal worksheet view for phones.
function installMobileDashboard() {
  const book=SpreadsheetApp.getActiveSpreadsheet();
  const source=book.getSheetByName('RSVPs');
  if (!source) throw new Error('RSVPs source tab is missing.');
  assertHeaders_(source);
  let dashboard=book.getSheetByName('Dashboard');
  if (dashboard) throw new Error('Dashboard already exists; inspect it before making changes.');
  const blank=book.getSheetByName('Sheet1');
  dashboard=blank && blank.getLastRow()===0 ? blank.setName('Dashboard') : book.insertSheet('Dashboard',0);
  book.setActiveSheet(dashboard);book.moveActiveSheet(1);
  dashboard.getRange('A1:C45').setFontFamily('Arial').setFontSize(11).setVerticalAlignment('middle');
  dashboard.setColumnWidth(1,125).setColumnWidth(2,80).setColumnWidth(3,155);
  dashboard.setHiddenGridlines(true);
  dashboard.getRange('A1:C1').merge().setValue('BABY JABARI MUNGAI').setFontSize(16).setFontWeight('bold').setFontColor('#145fad');
  dashboard.getRange('A2:C2').merge().setValue('RSVP DASHBOARD · 5 DEC 2026').setFontColor('#667d91').setFontSize(10);
  dashboard.getRange('A3:C3').merge().setValue('Updates automatically as guests RSVP').setFontColor('#667d91').setFontSize(10);
  const labels=['Responses','Expected guests','Attending responses','Maybe responses','Not attending'];
  const formulas=[
    '=COUNTIFS(RSVPs!A2:A,"<>",RSVPs!D2:D,"<>SYSTEM TEST*")',
    '=SUMIFS(RSVPs!G2:G,RSVPs!F2:F,"yes",RSVPs!D2:D,"<>SYSTEM TEST*")',
    '=COUNTIFS(RSVPs!F2:F,"yes",RSVPs!D2:D,"<>SYSTEM TEST*")',
    '=COUNTIFS(RSVPs!F2:F,"maybe",RSVPs!D2:D,"<>SYSTEM TEST*")',
    '=COUNTIFS(RSVPs!F2:F,"no",RSVPs!D2:D,"<>SYSTEM TEST*")'
  ];
  labels.forEach((label,i)=>{
    const row=5+i;
    dashboard.getRange(row,1,1,2).merge().setValue(label).setBackground('#f0f4f8');
    dashboard.getRange(row,3).setFormula(formulas[i]).setNumberFormat('0').setFontSize(19).setFontWeight('bold').setFontColor('#145fad').setHorizontalAlignment('center');
    dashboard.setRowHeight(row,38);
  });
  dashboard.getRange('A11:C11').merge().setValue('Labelled SYSTEM TEST entries excluded.').setFontColor('#667d91').setFontSize(10);
  dashboard.getRange('A12:C12').merge().setValue('Open the RSVPs tab for phone numbers and all details.').setWrap(true).setFontSize(10);
  dashboard.getRange('A14:C14').setValues([['Name','Attendance','Special message']]).setFontWeight('bold').setBackground('#e9edf1').setWrap(true);
  dashboard.getRange('A15').setFormula('=IFNA(QUERY(RSVPs!A2:H,"select D,F,H where A is not null and not D starts with \'SYSTEM TEST\' order by C desc limit 30 label D \'\', F \'\', H \'\'",0),"")');
  dashboard.getRange('A15:C44').setWrap(true);
  dashboard.setRowHeights(15,30,64);
  dashboard.setRowHeight(1,36);dashboard.setRowHeight(2,26);dashboard.setRowHeight(3,24);dashboard.setRowHeight(12,38);dashboard.setRowHeight(14,36);
  dashboard.setFrozenRows(3);
  SpreadsheetApp.flush();
  Logger.log('Mobile Dashboard ready: '+book.getUrl()+'#gid='+dashboard.getSheetId());
}
