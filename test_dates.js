// Test date generation logic
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
};

const getWeekLabels = () => {
  const labels = [];
  const weekDates = [];
  const today = new Date('2025-08-09'); // Today is August 9, 2025
  
  console.log('Today:', today.toISOString());
  console.log('---');
  
  for (let i = 9; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (i * 7));
    const mondayOfWeek = getWeekStartDate(weekStart);
    
    console.log(`Week ${10-i}: ${mondayOfWeek.toISOString().split('T')[0]} (${mondayOfWeek.toDateString()})`);
    weekDates.push(mondayOfWeek.toISOString().split('T')[0]);
  }
  
  return weekDates;
};

console.log('\nFrontend is generating these week dates:');
const dates = getWeekLabels();
console.log(dates);

console.log('\n\nDates we have in the database (from SQL scripts):');
const dbDates = [
  '2025-05-12', '2025-05-19', '2025-05-26',
  '2025-06-02', '2025-06-09', '2025-06-16', '2025-06-23', '2025-06-30',
  '2025-07-07', '2025-07-14', '2025-07-21', '2025-07-28',
  '2025-08-04'
];
console.log(dbDates);

console.log('\n\nMismatch analysis:');
dates.forEach(date => {
  const inDb = dbDates.includes(date);
  console.log(`${date}: ${inDb ? '✓ IN DB' : '✗ NOT IN DB'}`);
});