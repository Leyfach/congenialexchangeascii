const pool = require('../../shared/config/database');
const bcrypt = require('bcryptjs');

// In-memory fallback storage when database is not available
let memoryUsers = [
  {
    id: 1,
    email: 'test@test.com',
    password_hash: '$2a$10$e4X8f5JYT8i8lYyYF6WPUO.Szsz7Kjb01/wCBc3Ws1n5Cwg/nWClK', // password: "password123"
    created_at: new Date()
  }
];
let nextUserId = 2;

class UserModel {
  static async create(email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const query = `
        INSERT INTO users (email, password_hash) 
        VALUES ($1, $2) 
        RETURNING id, email, created_at
      `;
      const result = await pool.query(query, [email, hashedPassword]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory storage');
      const user = {
        id: nextUserId++,
        email,
        password_hash: hashedPassword,
        created_at: new Date()
      };
      memoryUsers.push(user);
      return { id: user.id, email: user.email, created_at: user.created_at };
    }
  }

  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory storage');
      return memoryUsers.find(user => user.email === email);
    }
  }

  static async findById(id) {
    try {
      const query = 'SELECT id, email, created_at FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.log('Database not available, using in-memory storage');
      const user = memoryUsers.find(user => user.id === parseInt(id));
      return user ? { id: user.id, email: user.email, created_at: user.created_at } : null;
    }
  }

  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = UserModel;