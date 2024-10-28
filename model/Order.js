const pool = require('../utils/dbConnection');

class Order {
  static async create(orderData) {
    const query = `
      INSERT INTO orders (
        user_id, total_amount, status, shipping_address, billing_address, 
        payment_method, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    const values = [
      orderData.userId,
      orderData.totalAmount,
      orderData.status || 'pending',
      orderData.shippingAddress,
      orderData.billingAddress,
      orderData.paymentMethod
    ];

    try {
      const [result] = await pool.query(query, values);
      console.log("Sipariş başarıyla oluşturuldu");
      return result.insertId;
    } catch (err) {
      console.error('Sipariş oluşturma hatası', err.stack);
      throw err;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM orders WHERE id = ?';
    try {
      const [rows] = await pool.query(query, [id]);
      return rows[0];
    } catch (err) {
      console.error('Sipariş getirme hatası', err.stack);
      throw err;
    }
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC';
    try {
      const [rows] = await pool.query(query, [userId]);
      return rows;
    } catch (err) {
      console.error('Kullanıcı siparişlerini getirme hatası', err.stack);
      throw err;
    }
  }

  static async update(id, updateData) {
    const updateFields = [];
    const values = [];

    for (const [key, value] of Object.entries(updateData)) {
      updateFields.push(`${key} = ?`);
      values.push(value);
    }

    const query = `
      UPDATE orders
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    values.push(id);

    try {
      const [result] = await pool.query(query, values);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Sipariş güncelleme hatası', err.stack);
      throw err;
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM orders WHERE id = ?';
    try {
      const [result] = await pool.query(query, [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Sipariş silme hatası', err.stack);
      throw err;
    }
  }

  static async getCount() {
    const query = 'SELECT COUNT(*) as count FROM orders';
    try {
      const [rows] = await pool.query(query);
      return rows[0].count;
    } catch (err) {
      console.error('Sipariş sayısı alma hatası', err.stack);
      throw err;
    }
  }

  static async addOrderItem(orderId, productId, quantity, price) {
    const query = `
      INSERT INTO order_items (order_id, product_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `;
    const values = [orderId, productId, quantity, price];

    try {
      const [result] = await pool.query(query, values);
      console.log("Sipariş öğesi başarıyla eklendi");
      return result.insertId;
    } catch (err) {
      console.error('Sipariş öğesi ekleme hatası', err.stack);
      throw err;
    }
  }

  static async getOrderItems(orderId) {
    const query = `
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    try {
      const [rows] = await pool.query(query, [orderId]);
      return rows;
    } catch (err) {
      console.error('Sipariş öğelerini getirme hatası', err.stack);
      throw err;
    }
  }

  static async findBySellerId(sellerId) {
    const query = `
      SELECT o.*, u.name as user_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE p.seller_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    try {
      const [rows] = await pool.query(query, [sellerId]);
      return rows;
    } catch (err) {
      console.error('Satıcı siparişlerini getirme hatası', err.stack);
      throw err;
    }
  }
}

module.exports = Order;