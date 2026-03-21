const fs = require('fs');
let content = fs.readFileSync('packages/web/src/pages/PlanPage.tsx', 'utf8');

// Fix the print CSS - replace the problematic visibility approach
const oldPrintCSS = `  body * { visibility: hidden; }
  #weekly-plan-print, #weekly-plan-print * { visibility: visible; }
  #weekly-plan-print {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }`;

const newPrintCSS = `  /* Hide screen UI, show print div */
  body > * { display: none !important; }
  #weekly-plan-print { 
    display: block !important;
    position: static !important;
    width: 100% !important;
  }`;

content = content.replace(oldPrintCSS, newPrintCSS);

// Also fix handlePrint to ensure div is visible before printing
const oldHandlePrint = `  function handlePrint() {
    const printDiv = document.getElementById('weekly-plan-print');
    if (printDiv) printDiv.style.display = 'block';
    window.print();
    setTimeout(() => {
      if (printDiv) printDiv.style.display = 'none';
    }, 1000);
  }`;

const newHandlePrint = `  function handlePrint() {
    const printDiv = document.getElementById('weekly-plan-print');
    if (printDiv) {
      printDiv.style.display = 'block';
      printDiv.style.position = 'fixed';
      printDiv.style.top = '0';
      printDiv.style.left = '0';
      printDiv.style.width = '100%';
      printDiv.style.zIndex = '99999';
      printDiv.style.background = 'white';
    }
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        if (printDiv) {
          printDiv.style.display = 'none';
          printDiv.style.position = '';
          printDiv.style.top = '';
          printDiv.style.left = '';
          printDiv.style.zIndex = '';
          printDiv.style.background = '';
        }
      }, 500);
    }, 100);
  }`;

content = content.replace(oldHandlePrint, newHandlePrint);

fs.writeFileSync('packages/web/src/pages/PlanPage.tsx', content, 'utf8');
console.log('Done!');
