const Product = require('../model/Product');
const User = require('../model/User');
class HomeController {
  static async getHomePage(req, res) {
    try {
      // Tüm ürünleri getir
      const products = await Product.findAll();
      let user = null;
      if(req.session && req.session.userId) {
        user = await User.findById(req.session.userId); 
      }
      const mostLikedProducts = await Product.getMostLikedProducts(5);
      // Anasayfayı render et
      res.render('pages/homepage', {
        title: 'Anasayfa',
        products: products,
        user: user,
        mostLikedProducts
      });
    } catch (error) {
      console.error('Anasayfa yükleme hatası:', error);
      res.status(500).render('error', { 
        title: 'Hata', 
        error: 'Anasayfa yüklenirken bir hata oluştu' 
      });
    }
  }
}

module.exports = HomeController;