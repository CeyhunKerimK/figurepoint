const pool = require('../utils/dbConnection');

class Product {
  static async create({ name, description, price, stock, imageUrl, sellerId, categoryId }) {
    const query = `
      INSERT INTO products (name, description, price, stock, image_url, seller_id, category_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const values = [name, description, price, stock, imageUrl, sellerId, categoryId];
  
    try {
      const [result] = await pool.query(query, values);
      console.log("Ürün başarıyla oluşturuldu");
      const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
      return rows[0];
    } catch (err) {
      console.error('Ürün oluşturma hatası', err.stack);
      throw err;
    }
  }

  static async findProductsByUserId(userId){
    const query = 'SELECT * from products p where p.seller_id = ?;';
    try {
      const [result] = await pool.query(query,[userId]);
      return result;
    } catch (err) {
      console.error('Aratılan satıcı id"si için bir ürün bulunamamıştır :',err.stack)
    }
  }

  static async findAll(limit = 10, offset = 0) {
    const query = `
      SELECT p.*, u.id as seller_id, u.name as seller_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?;
    `;
    try {
      const [rows] = await pool.query(query, [limit, offset]);
      return rows.map(row => ({
        ...row,
        seller: row.seller_id ? { id: row.seller_id, name: row.seller_name } : null
      }));
    } catch (err) {
      console.error('Ürünleri getirme hatası', err.stack);
      throw err;
    }
  }

  static async findById(id) {
    const query = `
      SELECT p.*, c.category_name as category_name 
      FROM products p
      LEFT JOIN category c ON p.category_id = c.id
      WHERE p.id = ?;
    `;
    try {
      const [rows] = await pool.query(query, [id]);
      return rows[0];
    } catch (err) {
      console.error('ID ile ürün getirme hatası', err.stack);
      throw err;
    }
  }

  static async update(id, { name, description, price, stock, imageUrl, categoryId }) {
    const query = `
      UPDATE products
      SET name = ?, description = ?, price = ?, stock = ?, image_url = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `;
    const values = [name, description, price, stock, imageUrl, categoryId, id];
    try {
      const [result] = await pool.query(query, values);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Ürün güncelleme hatası', err.stack);
      throw err;
    }
  }

  static async delete(id) {    
    const query = 'DELETE FROM products WHERE id = ?;';
    try {
      const [result] = await pool.query(query, [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Ürün silme hatası', err.stack);
      throw err;
    }
  }

  static async searchByName(name) {
    const query = 'SELECT * FROM products WHERE name LIKE ?;';
    try {
      const [rows] = await pool.query(query, [`%${name}%`]);
      return rows;
    } catch (err) {
      console.error('İsme göre ürün arama hatası', err.stack);
      throw err;
    }
  }

  static async getProductCount() {
    const query = 'SELECT COUNT(*) as count FROM products;';
    try {
      const [rows] = await pool.query(query);
      return parseInt(rows[0].count);
    } catch (err) {
      console.error('Ürün sayısı alma hatası', err.stack);
      throw err;
    }
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC;';
    try {
      const [rows] = await pool.query(query, [userId]);
      return rows;
    } catch (err) {
      console.error('Kullanıcının ürünlerini getirme hatası', err.stack);
      throw err;
    }
  }
  static async findByUserIdWithFilters(userId, filter = {}, sort = {}) {
      // Combine the userId filter with any additional filters
      const combinedFilter = { ...filter, userId };
      return this.find(combinedFilter).sort(sort);
  }

  static async getUniqueCategories() {
      return this.distinct('category');
  }
  static async getCategories() {
    const query = 'SELECT * FROM category ORDER BY category_name;';
    try {
      const [rows] = await pool.query(query);
      return rows;
    } catch (err) {
      console.error('Kategorileri alma hatası', err.stack);
      throw err;
    }
  }

  static async searchByName(name) {
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.name LIKE ? OR p.description LIKE ?
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    const searchTerm = `%${name}%`;
    try {
      const [rows] = await pool.query(query, [searchTerm, searchTerm]);
      return rows;
    } catch (err) {
      console.error('İsme göre ürün arama hatası', err.stack);
      throw err;
    }
  }
  static async toggleWishlist(userId, productId) {
    const query = `
      INSERT INTO wishlists (user_id, product_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE id = id;
    `;
    try {
      await pool.query(query, [userId, productId]);
      return true;
    } catch (err) {
      console.error('İstek listesi güncelleme hatası', err.stack);
      return false;
    }
  }

  static async isInWishlist(userId, productId) {
    const query = 'SELECT * FROM wishlists WHERE user_id = ? AND product_id = ?';
    try {
      const [rows] = await pool.query(query, [userId, productId]);
      return rows.length > 0;
    } catch (err) {
      console.error('İstek listesi kontrol hatası', err.stack);
      return false;
    }
  }

  static async updateLikes(productId, isLike) {
    const query = `UPDATE products SET ${isLike ? 'likes' : 'dislikes'} = ${isLike ? 'likes' : 'dislikes'} + 1 WHERE id = ?`;
    try {
      await pool.query(query, [productId]);
      return true;
    } catch (err) {
      console.error('Beğeni güncelleme hatası', err.stack);
      return false;
    }
  }

  static async getMostLikedProducts(limit = 5) {
    const query = `
      SELECT p.*, u.name as seller_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      ORDER BY p.likes DESC
      LIMIT ?
    `;
    try {
      const [rows] = await pool.query(query, [limit]);
      return rows;
    } catch (err) {
      console.error('En beğenilen ürünleri getirme hatası', err.stack);
      throw err;
    }
  }
}

module.exports = Product;