/**
 * Check if user diego has any courses in their purchased items
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.join(__dirname, 'prompts.db');
if (!fs.existsSync(dbPath)) {
  dbPath = path.join(__dirname, 'database.sqlite');
}

const db = new Database(dbPath);

try {
  const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get('diego');
  
  if (!user) {
    console.log('User diego not found');
    process.exit(0);
  }

  console.log('User: diego (ID:', user.id + ')');
  
  const orders = db.prepare('SELECT id, order_number, items, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
  console.log('Total orders:', orders.length);
  
  console.log('\n=== All Purchased Products ===');
  
  const productIds = new Set();
  orders.forEach(order => {
    try {
      const items = JSON.parse(order.items);
      items.forEach(item => {
        if (item.id) productIds.add(item.id);
      });
    } catch(e) {
      // Skip invalid JSON
    }
  });

  if (productIds.size === 0) {
    console.log('No products found in orders');
    db.close();
    process.exit(0);
  }

  const products = db.prepare(
    'SELECT id, name, is_course, course_date, course_zoom_link, description FROM products WHERE id IN (' + 
    Array.from(productIds).map(() => '?').join(',') + ')'
  ).all(...Array.from(productIds));

  products.forEach(p => {
    console.log('\nProduct ID:', p.id);
    console.log('  Name:', p.name);
    const isCourse = p.is_course === 1 || p.is_course === true;
    console.log('  Is Course:', isCourse ? 'YES' : 'NO');
    if (isCourse) {
      console.log('  Course Date:', p.course_date || 'Not set');
      console.log('  Zoom Link:', p.course_zoom_link || 'Not set');
    }
  });

  const courses = products.filter(p => p.is_course === 1 || p.is_course === true);
  
  console.log('\n=== Summary ===');
  console.log('Total products purchased:', products.length);
  console.log('Courses purchased:', courses.length);
  
  if (courses.length > 0) {
    console.log('\nYES - User diego HAS courses in their purchased items!');
    console.log('Course names:');
    courses.forEach(c => console.log('  -', c.name));
  } else {
    console.log('\nNO - User diego does NOT have any courses in their purchased items.');
  }
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}

