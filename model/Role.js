const pool = require('../utils/dbConnection');

class Role {
  static async create(name, description) {
    const query = 'INSERT INTO roles (name, description) VALUES (?, ?)';
    try {
      const [result] = await pool.query(query, [name, description]);
      return result.insertId;
    } catch (err) {
      console.error('Rol oluşturma hatası', err.stack);
      throw err;
    }
  }

  static async findAll() {
    const query = 'SELECT * FROM roles';
    try {
      const [rows] = await pool.query(query);
      return rows;
    } catch (err) {
      console.error('Rolleri getirme hatası', err.stack);
      throw err;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM roles WHERE id = ?';
    try {
      const [rows] = await pool.query(query, [id]);
      return rows[0];
    } catch (err) {
      console.error('Rol getirme hatası', err.stack);
      throw err;
    }
  }

  static async findByName(name) {
    const query = 'SELECT * FROM roles WHERE name = ?';
    try {
      const [rows] = await pool.query(query, [name]);
      return rows[0];
    } catch (err) {
      console.error('İsme göre rol getirme hatası', err.stack);
      throw err;
    }
  }

  static async update(id, name, description) {
    const query = 'UPDATE roles SET name = ?, description = ? WHERE id = ?';
    try {
      const [result] = await pool.query(query, [name, description, id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Rol güncelleme hatası', err.stack);
      throw err;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM roles WHERE id = ?';
    try {
      const [result] = await pool.query(query, [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Rol silme hatası', err.stack);
      throw err;
    }
  }

  static async getUsersWithRole(roleId) {
    const query = `
      SELECT u.* 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = ?
    `;
    try {
      const [rows] = await pool.query(query, [roleId]);
      return rows;
    } catch (err) {
      console.error('Rolle ilişkili kullanıcıları getirme hatası', err.stack);
      throw err;
    }
  }

  static async assignRoleToUser(userId, roleId) {
    const query = 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)';
    try {
      const [result] = await pool.query(query, [userId, roleId]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Kullanıcıya rol atama hatası', err.stack);
      throw err;
    }
  }

  static async removeRoleFromUser(userId, roleId) {
    const query = 'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?';
    try {
      const [result] = await pool.query(query, [userId, roleId]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Kullanıcıdan rol çıkarma hatası', err.stack);
      throw err;
    }
  }

  static async getUserRoles(userId) {
    const query = `
      SELECT r.* 
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `;
    try {
      const [rows] = await pool.query(query, [userId]);
      return rows;
    } catch (err) {
      console.error('Kullanıcı rollerini getirme hatası', err.stack);
      throw err;
    }
  }
}

module.exports = Role;