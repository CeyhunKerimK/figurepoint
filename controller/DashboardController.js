const Product = require('../model/Product');
const User = require('../model/User');
const Role = require('../model/Role');
const Order = require('../model/Order');

class Dashboard {
    static async getDashboard(req, res) {
        try {
            if (!req.session.userId) {
                return res.redirect('/user/login');
            }

            const user = await User.findById(req.session.userId);

            if (!user || !user.roles.includes('admin')) {
                return res.redirect('/user/login');
            }

            // İstatistik verilerini al
            const userCount = await User.getCustomerCount();
            const productCount = await Product.getProductCount();
            const orderCount = await Order.getCount();
            const users = await User.findAll();  // Tüm kullanıcıları getir
            const products = await Product.findAll();  // Tüm ürünleri getir
            const roles = await Role.findAll();  // Tüm rolleri getir

            // Grafik için kullanılacak veriler
            const chartData = {
                userCount,
                productCount,
                orderCount
            };

            // Verileri frontend'e aktar
            const data = {
                title: 'Admin Dashboard',
                user,
                userCount,
                productCount,
                orderCount,
                users,
                products,
                roles,
                chartData
            };

            res.render('pages/admin/dashboard', data);
        } catch (error) {
            console.error('Dashboard yükleme hatası:', error);
            res.status(500).render('error', { 
                title: 'Hata', 
                error: 'Dashboard yüklenirken bir hata oluştu' 
            });
        }
    }
}

module.exports = Dashboard;
