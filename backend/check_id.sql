SELECT 'teams' as table_name, id, name FROM teams WHERE id = '43f9d904-ad76-48fb-a201-d6e1baf2a84d'
UNION ALL
SELECT 'departments' as table_name, id, name FROM departments WHERE id = '43f9d904-ad76-48fb-a201-d6e1baf2a84d';
