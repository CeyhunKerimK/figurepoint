const Product = require('../model/Product');
const { upload, uploadToGCS } = require('../middleware/uploadMiddleware');
const pool = require('../utils/dbConnection');
class ProductController {
  static async getCreateProductPage(req, res) {
    try {
      const categories = await Product.getCategories();
      res.render('pages/product/create', { categories });
    } catch (error) {
      console.error('Kategori getirme hatası:', error);
      res.status(500).render('error', { error: 'Kategoriler yüklenirken bir hata oluştu' });
    }
  }

  static async createProduct(req, res) {
    upload.single('image')(req, res, async(err) => {
      if(err){
        console.error('File cannot upload on GCS\nerror : ', err);
        return res.status(400).render('pages/product/create', {error : 'Dosya yükleme hatası ile karşılaşıldı'});
      }
      try {
        let imageUrl = null;
        if(req.file){
          imageUrl = await uploadToGCS(req.file);
        }
 
        const productData = {
          ...req.body,
          imageUrl,
          sellerId: req.user.id,
          categoryId: req.body.category_id
        };
 
        if (!productData.name || !productData.price || !productData.categoryId) {
          const categories = await Product.getCategories();
          return res.status(400).render('pages/product/create', {
            error : 'İsim, fiyat ve kategori alanları zorunludur.',
            categories
          });
        }
 
        const newProduct = await Product.create(productData);
        res.redirect('/product/list');
 
      } catch (error) {
        console.error('Ürün oluşturma hatası ile karşılaşıldı : ', error);
        res.status(500).render('pages/product/create', {error : 'Ürün oluşturulamadı. Hatalı bir alan girildi.'});
      }
    });
  }

  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await Product.findById(id);
      if (product) {
        res.render('pages/product/detail', { product });
      } else {
        res.status(404).render('pages/product/detail', { error: 'Ürün bulunamadı' });
      }
    } catch (error) {
      console.error('Ürün getirme hatası:', error);
      res.status(500).render('error', { error: 'Ürün getirilirken bir hata oluştu' });
    }
  }

  static async getUpdateProductPage(req, res) {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).render('error', { 
          title: 'Hata',
          message: 'Ürün bulunamadı'
        });
      }
  
      res.render('pages/product/edit', {
        title: 'Ürün Güncelle',
        product
      });
    } catch (error) {
      console.error('Ürün güncelleme sayfası yükleme hatası:', error);
      res.status(500).render('error', {
        title: 'Hata',
        message: 'Ürün güncelleme sayfası yüklenirken bir hata oluştu'
      });
    }
  }

  static async getUpdateProductPage(req, res) {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      const categories = await Product.getCategories();
  
      if (!product) {
        return res.status(404).render('error', { 
          title: 'Hata',
          message: 'Ürün bulunamadı'
        });
      }
  
      res.render('pages/product/edit', {
        title: 'Ürün Güncelle',
        product,
        categories
      });
    } catch (error) {
      console.error('Ürün güncelleme sayfası yükleme hatası:', error);
      res.status(500).render('error', {
        title: 'Hata',
        message: 'Ürün güncelleme sayfası yüklenirken bir hata oluştu'
      });
    }
  }

  static async updateProduct(req, res) {
    upload.single('image')(req, res, async(err) => {
      if(err){
        console.error('File cannot upload on GCS\nerror : ', err);
        return res.status(400).render('pages/product/edit', {
          title: 'Ürün Güncelle',
          product: { id: req.params.id, ...req.body },
          error: 'Dosya yükleme hatası ile karşılaşıldı'
        });
      }
      try {
        const productId = req.params.id;
        
        const existingProduct = await Product.findById(productId);
  
        if (!existingProduct) {
          return res.status(404).render('error', { error: 'Ürün bulunamadı' });
        }
  
        let imageUrl = existingProduct.imageUrl;
        if(req.file){
          imageUrl = await uploadToGCS(req.file);
          if (existingProduct.imageUrl) {
            await deleteFromGCS(existingProduct.imageUrl);
          }
        }
  
        const productData = {
          ...req.body,
          imageUrl,
          categoryId: req.body.category_id
        };
  
        if (req.body.removeImage === 'on') {
          if (existingProduct.imageUrl) {
            await deleteFromGCS(existingProduct.imageUrl);
          }
          productData.imageUrl = null;
        }
  
        if (!productData.name || !productData.price || !productData.categoryId) {
          const categories = await Product.getCategories();
          return res.status(400).render('pages/product/edit', {
            title: 'Ürün Güncelle',
            product: { id: productId, ...productData },
            categories,
            error: 'İsim, fiyat ve kategori alanları zorunludur.'
          });
        }
  
        const updatedProduct = await Product.update(productId, productData);
        
        if (updatedProduct) {
          req.flash('success', 'Ürün başarıyla güncellendi.');
          res.redirect('/product/list');
        } else {
          throw new Error('Ürün güncellenemedi.');
        }
  
      } catch (error) {
        console.error('Ürün güncelleme hatası ile karşılaşıldı : ', error);
        res.status(500).render('pages/product/edit', {
          title: 'Ürün Güncelle',
          product: { id: req.params.id, ...req.body },
          error: 'Ürün güncellenemedi. Hatalı bir alan girildi.'
        });
      }
    });
  }

  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const deletedProduct = await Product.delete(id);
      if (deletedProduct) {
        res.redirect('/product/list');
      } else {
        res.status(404).render('error', { error: 'Silinecek ürün bulunamadı' });
      }
    } catch (error) {
      console.error('Ürün silme hatası:', error);
      res.status(500).render('error', { error: 'Ürün silinirken bir hata oluştu' });
    }
  }

  static async searchProductsByName(req, res) {
    try {
      const { name } = req.query;
      const products = await Product.searchByName(name);
      res.render('pages/product/search-results', { products, searchTerm: name });
    } catch (error) {
      console.error('Ürün arama hatası:', error);
      res.status(500).render('error', { error: 'Ürünler aranırken bir hata oluştu' });
    }
  }

  static async getProductCount(req, res) {
    try {
      const count = await Product.getProductCount();
      res.render('pages/product/count', { count });
    } catch (error) {
      console.error('Ürün sayısı alma hatası:', error);
      res.status(500).render('error', { error: 'Ürün sayısı alınırken bir hata oluştu' });
    }
  }
  static async searchProducts(req, res) {
    try {
      const { term } = req.query;
      if (!term) {
        return res.status(400).json({ error: 'Arama terimi gereklidir.' });
      }

      const products = await Product.searchByName(term);

      // API isteği için JSON yanıtı
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(products);
      }

      // Normal sayfa isteği için görünüm render etme
      res.render('pages/product/search-results', { products, searchTerm: term });
    } catch (error) {
      console.error('Ürün arama hatası:', error);
      res.status(500).json({ error: 'Ürünler aranırken bir hata oluştu' });
    }
  }

  static async listProducts(req, res) {
    try {
      const products = await Product.findAll();
      // Eğer kullanıcı giriş yapmışsa, istek listesini kontrol et
      if (req.user) {
        for (let product of products) {
          product.isInWishlist = await Product.isInWishlist(req.user.id, product.id);
        }
      }
      res.render('pages/product/list', { products });
    } catch (error) {
      console.error('Ürün listesi getirme hatası:', error);
      res.status(500).render('error', { message: 'Ürünler yüklenirken bir hata oluştu.' });
    }
  }

  static async toggleLike(req, res) {
    try {
      const { id: productId } = req.params;
      const userId = req.session.userId;
  
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
  
      // İlk sorgu: Beğeni sayısını güncelle
      await pool.query(`
        UPDATE products
        SET likes = CASE
            WHEN likes > 0 THEN likes - 1
            ELSE likes + 1
        END
        WHERE id = ?
      `, [productId]);
  
      // İkinci sorgu: Güncellenmiş beğeni sayısını al
      const [result] = await pool.query(`
        SELECT likes
        FROM products
        WHERE id = ?
      `, [productId]);
  
      if (result && result.length > 0) {
        const newLikeCount = result[0].likes;
        res.json({ success: true, likeCount: newLikeCount });
      } else {
        res.status(400).json({ success: false, message: 'Beğeni güncellenemedi.' });
      }
    } catch (error) {
      console.error('Beğeni güncelleme hatası:', error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    }
  }

  static async toggleWishlist(req, res) {
    try {
      const { id } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Bu işlem için giriş yapmanız gerekiyor.' });
      }

      const success = await Product.toggleWishlist(req.user.id, id);
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ success: false, message: 'İstek listesi güncellenemedi.' });
      }
    } catch (error) {
      console.error('İstek listesi güncelleme hatası:', error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    }
  }

  static async getWishlist(req, res) {
    try {
      if (!req.user) {
        return res.redirect('/login');
      }

      const wishlistItems = await Product.getWishlistItems(req.user.id);
      res.render('pages/user/wishlist', { wishlistItems });
    } catch (error) {
      console.error('İstek listesi getirme hatası:', error);
      res.status(500).render('error', { message: 'İstek listesi yüklenirken bir hata oluştu.' });
    }
  }
  
}

module.exports = ProductController;