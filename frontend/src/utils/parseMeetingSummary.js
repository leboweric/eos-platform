export const parseMeetingSummary = (htmlString) => {
  if (!htmlString) return null;

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const summaryData = {
    aiSummary: null,
    headlines: { customer: [], employee: [] },
    cascadingMessages: [],
    issues: { solved: [], new: [] },
    todos: { completed: [], new: [] },
    rating: null
  };

  // Extract AI Summary
  const aiSummaryEl = doc.querySelector('.ai-summary-box');
  if (aiSummaryEl) {
    const text = aiSummaryEl.textContent.replace('AI Meeting Summary', '').trim();
    if (text && !text.includes('No AI summary')) {
      summaryData.aiSummary = text;
    }
  }

  // Extract sections
  const sections = doc.querySelectorAll('.section');
  
  sections.forEach(section => {
    const title = section.querySelector('.section-title')?.textContent?.trim();
    
    if (!title) return;

    switch(title) {
      case 'Headlines':
        // Customer headlines
        const customerSection = Array.from(section.querySelectorAll('.subsection'))
          .find(sub => sub.textContent.includes('Customer/External'));
        if (customerSection) {
          const items = customerSection.querySelectorAll('.list li');
          summaryData.headlines.customer = Array.from(items).map(item => ({
            title: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
            description: item.querySelector('.list-item-meta')?.textContent?.trim()
          }));
        }

        // Employee headlines  
        const employeeSection = Array.from(section.querySelectorAll('.subsection'))
          .find(sub => sub.textContent.includes('Employee/Internal'));
        if (employeeSection) {
          const items = employeeSection.querySelectorAll('.list li');
          summaryData.headlines.employee = Array.from(items).map(item => ({
            title: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
            description: item.querySelector('.list-item-meta')?.textContent?.trim()
          }));
        }
        break;

      case 'Cascading Messages':
        const msgItems = section.querySelectorAll('.list li');
        summaryData.cascadingMessages = Array.from(msgItems).map(item => ({
          message: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
          from: item.querySelector('.list-item-meta')?.textContent?.replace('From: ', '').trim()
        }));
        break;

      case 'Solved Issues':
        const solvedItems = section.querySelectorAll('.list li');
        summaryData.issues.solved = Array.from(solvedItems).map(item => ({
          title: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
          owner: item.querySelector('.list-item-meta')?.textContent?.replace('Owner: ', '').trim()
        }));
        break;

      case 'New Issues':
        const newIssueItems = section.querySelectorAll('.list li');
        summaryData.issues.new = Array.from(newIssueItems).map(item => ({
          title: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
          owner: item.querySelector('.list-item-meta')?.textContent?.replace('Owner: ', '').trim()
        }));
        break;

      case 'Completed To-Dos':
        const completedItems = section.querySelectorAll('.list li');
        summaryData.todos.completed = Array.from(completedItems).map(item => ({
          title: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
          assignee: item.querySelector('.list-item-meta')?.textContent?.replace('Completed by: ', '').trim()
        }));
        break;

      case 'New To-Dos':
        const newTodoItems = section.querySelectorAll('.list li');
        summaryData.todos.new = Array.from(newTodoItems).map(item => {
          const metaText = item.querySelector('.list-item-meta')?.textContent?.trim() || '';
          const parts = metaText.split(' • ');
          return {
            title: item.querySelector('.list-item-title')?.textContent?.trim() || item.textContent.trim(),
            assignee: parts[0]?.replace('Assigned to: ', '').trim(),
            dueDate: parts[1]?.replace('Due: ', '').trim()
          };
        });
        break;

      case 'Meeting Rating':
        const ratingText = section.querySelector('.rating-display strong')?.textContent;
        if (ratingText) {
          const rating = parseFloat(ratingText.split('/')[0]);
          if (!isNaN(rating)) {
            summaryData.rating = rating;
          }
        }
        break;
    }
  });

  // Check for empty states
  const emptyStates = doc.querySelectorAll('.empty-state');
  emptyStates.forEach(emptyEl => {
    const text = emptyEl.textContent.trim().toLowerCase();
    // These are handled by returning empty arrays above
  });

  return summaryData;
};