export function numberToWordsIndian(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];

  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  }

  const roundedNum = Math.abs(num);
  const rupees = Math.floor(roundedNum);
  const paise = Math.round((roundedNum - rupees) * 100);

  let output = '';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore > 0) {
    output += inWords(crore) + 'Crore ';
  }
  if (lakh > 0) {
    output += inWords(lakh) + 'Lakh ';
  }
  if (thousand > 0) {
    output += inWords(thousand) + 'Thousand ';
  }
  if (hundred > 0) {
    output += inWords(hundred);
  }

  output = output.trim();
  if (!output) output = 'Zero';

  let result = output + ' Rupees';

  if (paise > 0) {
    result += ' and ' + inWords(paise).trim() + ' Paise';
  }

  return result + ' Only';
}
