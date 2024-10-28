const pool = require('../utils/dbConnection');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
class User {
  static async create({ name, email, password, roleIds }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const verificationToken = crypto.randomBytes(20).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

      const [result] = await connection.query(
        'INSERT INTO users (name, email, password, created_at, email_verification_token, email_verification_expires) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)',
        [name, email, password, verificationToken, verificationExpires]
      );

      const userId = result.insertId;

      // Eğer roleIds belirtilmemişse veya boş bir dizi ise, varsayılan olarak customer rolünü ata
      if (!roleIds || roleIds.length === 0) {
        const [customerRole] = await connection.query('SELECT id FROM roles WHERE name = ?', ['customer']);
        if (customerRole.length > 0) {
          roleIds = [customerRole[0].id];
        } else {
          throw new Error('Varsayılan customer rolü bulunamadı');
        }
      }

      // roleIds bir dizi değilse, onu diziye çevirelim
      const roleIdsArray = Array.isArray(roleIds) ? roleIds : [roleIds];

      for (let roleId of roleIdsArray) {
        await connection.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleId]
        );
      }

      await connection.commit();
      console.log("Kullanıcı başarıyla oluşturuldu");

      // Doğrulama e-postası gönder
      const verificationUrl = `http://yourdomain.com/verify-email/${verificationToken}`;
      await sendEmail(
        email,
        'E-posta Doğrulama',
        `E-posta adresinizi doğrulamak için lütfen şu bağlantıya tıklayın: ${verificationUrl}`,
        `<p>E-posta adresinizi doğrulamak için lütfen <a href="${verificationUrl}">buraya tıklayın</a>.</p>`
      );
      
      return await this.findByIdWithRoles(userId);
    } catch (err) {
      await connection.rollback();
      console.error('Kullanıcı oluşturma hatası', err.stack);
      throw err;
    } finally {
      connection.release();
    }
  }

  static async verifyEmail(token) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [users] = await connection.query(
        'SELECT id FROM users WHERE email_verification_token = ? AND email_verification_expires > CURRENT_TIMESTAMP',
        [token]
      );

      if (users.length === 0) {
        throw new Error('Geçersiz veya süresi dolmuş doğrulama bağlantısı.');
      }

      const userId = users[0].id;

      await connection.query(
        'UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
        [userId]
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      console.error('E-posta doğrulama hatası', err.stack);
      throw err;
    } finally {
      connection.release();
    }
  }

  static async findAll(limit = 10, offset = 0) {
    const query = `
      SELECT u.*, GROUP_CONCAT(r.name) as role_names 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      LEFT JOIN roles r ON ur.role_id = r.id 
      GROUP BY u.id
      ORDER BY u.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    try {
      const [rows] = await pool.query(query, [limit, offset]);
      return rows.map(row => ({
        ...row,
        roles: row.role_names ? row.role_names.split(',') : []
      }));
    } catch (err) {
      console.error('Kullanıcıları getirme hatası', err.stack);
      throw err;
    }
  }

  static async findById(id) {
    return this.findByIdWithRoles(id);
  }

  static async findByIdWithRoles(id) {
    const query = `
      SELECT u.*, GROUP_CONCAT(r.name) as role_names
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ?
      GROUP BY u.id
    `;
    try {
      const [rows] = await pool.query(query, [id]);
      if (rows.length > 0) {
        rows[0].roles = rows[0].role_names ? rows[0].role_names.split(',') : [];
        delete rows[0].role_names;
        return rows[0];
      }
      return null;
    } catch (err) {
      console.error('ID ile Kullanıcı ve rollerini getirme hatası', err.stack);
      throw err;
    }
  }

  static async findByEmail(email) {
    const query = `
      SELECT u.*, GROUP_CONCAT(r.name) as role_names
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = ?
      GROUP BY u.id
    `;
    try {
      const [rows] = await pool.query(query, [email]);
      if (rows.length > 0) {
        rows[0].roles = rows[0].role_names ? rows[0].role_names.split(',') : [];
        delete rows[0].role_names;
        return rows[0];
      }
      return null;
    } catch (err) {
      console.error('Email ile Kullanıcı getirme hatası', err.stack);
      throw err;
    }
  }

  static async update(id, updateData) {
    const currentUser = await this.findById(id);
    if (!currentUser) {
      throw new Error('Kullanıcı bulunamadı');
    }
  
    const fieldsToUpdate = [
      'name', 'email', 'phone', 'address', 'city', 'country', 
      'postal_code', 'date_of_birth', 'gender', 'image_url'
    ];
  
    const updateFields = [];
    const values = [];
  
    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined && updateData[field] !== currentUser[field]) {
        updateFields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });
  
    if (updateFields.length === 0) {
      return currentUser;
    }
  
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
  
    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?;
    `;
  
    values.push(id);
  
    try {
      const [result] = await pool.query(query, values);
      if (result.affectedRows > 0) {
        return await this.findById(id);
      } else {
        throw new Error('Kullanıcı güncellenemedi');
      }
    } catch (err) {
      console.error('Kullanıcı güncelleme hatası', err.stack);
      throw err;
    }
  }

  static async delete(id) {    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Önce user_roles tablosundan ilgili kayıtları sil
      await connection.query('DELETE FROM user_roles WHERE user_id = ?', [id]);

      // Sonra users tablosundan kullanıcıyı sil
      const [result] = await connection.query('DELETE FROM users WHERE id = ?', [id]);

      await connection.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      console.error('Kullanıcı silme hatası', err.stack);
      throw err;
    } finally {
      connection.release();
    }
  }

  static async searchByName(name) {
    const query = `
      SELECT u.*, GROUP_CONCAT(r.name) as role_names
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.name LIKE ?
      GROUP BY u.id
    `;
    try {
      const [rows] = await pool.query(query, [`%${name}%`]);
      return rows.map(row => ({
        ...row,
        roles: row.role_names ? row.role_names.split(',') : []
      }));
    } catch (err) {
      console.error('İsme göre Kullanıcı arama hatası', err.stack);
      throw err;
    }
  }

  static async getCustomerCount() {
    const query = 'SELECT COUNT(*) as count FROM users;';
    try {
      const [rows] = await pool.query(query);
      return parseInt(rows[0].count);
    } catch (err) {
      console.error('Kullanıcı sayısı alma hatası', err.stack);
      throw err;
    }
  }

  static async addRole(userId, roleId) {
    const query = 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)';
    try {
      const [result] = await pool.query(query, [userId, roleId]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Kullanıcıya rol ekleme hatası', err.stack);
      throw err;
    }
  }

  static async removeRole(userId, roleId) {
    const query = 'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?';
    try {
      const [result] = await pool.query(query, [userId, roleId]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Kullanıcıdan rol çıkarma hatası', err.stack);
      throw err;
    }
  }

  static async hasRole(userId, roleName) {
    const query = `
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.name = ?
    `;
    try {
      const [rows] = await pool.query(query, [userId, roleName]);
      return rows[0].count > 0;
    } catch (err) {
      console.error('Kullanıcı rol kontrolü hatası', err.stack);
      throw err;
    }
  }

  static async updateRoles(userId, roleIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);

      for (let roleId of roleIds) {
        await connection.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleId]
        );
      }

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      console.error('Kullanıcı rolleri güncelleme hatası', err.stack);
      throw err;
    } finally {
      connection.release();
    }
  }

  static async getUserRoles(userId) {
    const query = `
      SELECT r.id, r.name
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `;
    try {
      const [rows] = await pool.query(query, [userId]);
      return rows;
    } catch (err) {
      console.error('Kullanıcı rolleri getirme hatası', err.stack);
      throw err;
    }
  }

  static async findAllWithRoles() {
    const query = `
      SELECT u.*, GROUP_CONCAT(r.name) as role_names 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      LEFT JOIN roles r ON ur.role_id = r.id 
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;
    try {
      const [rows] = await pool.query(query);
      return rows.map(row => ({
        ...row,
        roles: row.role_names ? row.role_names.split(',') : []
      }));
    } catch (err) {
      console.error('Kullanıcıları rolleriyle getirme hatası', err.stack);
      throw err;
    }
  }
  static async verifyEmail(token) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [users] = await connection.query(
        'SELECT id FROM users WHERE email_verification_token = ? AND email_verification_expires > CURRENT_TIMESTAMP',
        [token]
      );

      if (users.length === 0) {
        throw new Error('Geçersiz veya süresi dolmuş doğrulama bağlantısı.');
      }

      const userId = users[0].id;

      await connection.query(
        'UPDATE users SET is_email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?',
        [userId]
      );

      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      console.error('E-posta doğrulama hatası', err.stack);
      throw err;
    } finally {
      connection.release();
    }
  }

  static async sendUpdateNotification(subject, text, html) {
    try {
      const [users] = await pool.query('SELECT email FROM users WHERE is_email_verified = TRUE');
      
      for (let user of users) {
        await sendEmail(user.email, subject, text, html);
      }

      return true;
    } catch (err) {
      console.error('Bildirim gönderme hatası', err.stack);
      throw err;
    }
  }

  static async findOne(email) {
    const query = 'SELECT * FROM users u WHERE u.email = ?';
    
    try {
        const [rows] = await pool.query(query, [email]);
        return rows.length > 0 ? rows[0] : null;
    } catch (err) {
        console.error('Kullanıcı arama hatası:', err.message);
        throw err;
    }
}
}

module.exports = User;