// Test what's happening with scorecard values

const score = { value: '225000', notes: 'test' };

console.log('=== BACKEND PROCESSING ===');
// What the backend is doing now
const hasNotes = score.notes && score.notes.trim().length > 0;
const numericValue = score.value !== null ? Number(score.value) : null;
const scoreData = hasNotes ? {
  value: numericValue,
  notes: score.notes
} : numericValue;

console.log('Backend sends:', JSON.stringify(scoreData, null, 2));
console.log('Type of value in object:', typeof scoreData.value);

console.log('\n=== FRONTEND PROCESSING ===');
// What the frontend does
const scoreValue = (typeof scoreData === 'object' && scoreData !== null) ? scoreData?.value : scoreData;
console.log('Frontend extracts:', scoreValue);
console.log('Type of extracted value:', typeof scoreValue);

console.log('\n=== FORMAT VALUE FUNCTION ===');
// What formatValue does
const numValue = typeof scoreValue === 'number' ? scoreValue : parseFloat(scoreValue);
console.log('formatValue converts to:', numValue);
console.log('Is NaN?', isNaN(numValue));

// Test with currency formatting
if (!isNaN(numValue)) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numValue);
  console.log('Final formatted value:', formatted);
}

console.log('\n=== TEST WITHOUT NOTES ===');
const scoreWithoutNotes = { value: '225000', notes: '' };
const hasNotes2 = scoreWithoutNotes.notes && scoreWithoutNotes.notes.trim().length > 0;
const numericValue2 = scoreWithoutNotes.value !== null ? Number(scoreWithoutNotes.value) : null;
const scoreData2 = hasNotes2 ? {
  value: numericValue2,
  notes: scoreWithoutNotes.notes
} : numericValue2;
console.log('Without notes, backend sends:', scoreData2);
console.log('Type:', typeof scoreData2);