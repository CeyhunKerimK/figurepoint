const { User, Product, Order } = require('../model/index');

class SellerController {
    static async getSellerDashboard(req, res) {
        try {
            const sellerId = req.user.id; // Oturum açmış kullanıcının ID'si
            const products = await Product.findByUserId(sellerId);
            const orders = await Order.findBySellerId(sellerId);
        
            // Basit analitik hesaplamaları
            const totalSales = orders.length > 0 
                ? orders.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)
                : 0;

            const currentMonth = new Date().getMonth();
            const monthlySales = orders.length > 0
                ? orders
                    .filter(order => new Date(order.created_at).getMonth() === currentMonth)
                    .reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0)
                : 0;
            
            // En çok satan ürünü bulmak için basit bir hesaplama
            let bestSellingProduct = 'Henüz satış yok';
            if (orders.length > 0 && orders[0].items) {
                const productSales = {};
                orders.forEach(order => {
                    if (Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            productSales[item.product_id] = (productSales[item.product_id] || 0) + (parseInt(item.quantity) || 0);
                        });
                    }
                });
                
                if (Object.keys(productSales).length > 0) {
                    const bestSellingProductId = Object.keys(productSales).reduce((a, b) => productSales[a] > productSales[b] ? a : b);
                    const bestProduct = products.find(p => p.id === parseInt(bestSellingProductId));
                    bestSellingProduct = bestProduct ? bestProduct.name : 'Belirlenemedi';
                }
            }

            res.render('pages/seller/seller-dashboard', {
                products,
                orders,
                totalSales,
                monthlySales,
                bestSellingProduct
            });
        } catch (error) {
            console.error('Satıcı paneli yükleme hatası:', error);
            res.status(500).send('Bir hata oluştu');
        }
    }
}

module.exports = SellerController;