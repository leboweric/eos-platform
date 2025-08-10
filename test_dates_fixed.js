// Test FIXED date generation logic
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  // Reset time to midnight to avoid timezone issues
  d.setHours(0, 0, 0, 0);
  return d;
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

console.log('\nFIXED Frontend will generate these week dates:');
const dates = getWeekLabels();
console.log(dates);

console.log('\n\nDates we have in the database:');
const dbDates = [
  '2025-05-12', '2025-05-19', '2025-05-26',
  '2025-06-02', '2025-06-09', '2025-06-16', '2025-06-23', '2025-06-30',
  '2025-07-07', '2025-07-14', '2025-07-21', '2025-07-28',
  '2025-08-04'
];
console.log(dbDates);

console.log('\n\nMatch analysis:');
dates.forEach(date => {
  const inDb = dbDates.includes(date);
  console.log(`${date}: ${inDb ? '✓ IN DB' : '✗ NOT IN DB'}`);
});

console.log('\n\n✅ MATCHES FOUND:');
dates.filter(date => dbDates.includes(date)).forEach(date => {
  console.log(`  - ${date}`);
});