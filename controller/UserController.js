const User = require('../model/User');
const Role = require('../model/Role');
const bcrypt = require('bcrypt');
const { upload, uploadToGCS, deleteFromGCS } = require('../middleware/uploadMiddleware');
class UserController {
  static async createCustomer(req, res) {
    upload.single('image')(req, res, async(err) => {
      if(err){
        console.error('File cannot upload on GCS\nerror : ', err);
        return res.status(400).render('pages/user/create-customer', {error : 'Dosya yükleme hatası ile karşılaşıldı'});
      }
      try {
        let imageUrl = null;
        if(req.file){
          imageUrl = await uploadToGCS(req.file);
        }
  
        const customerData = {
          ...req.body,
          image_url: imageUrl
        };
  
        if (!customerData.name || !customerData.email) {
          return res.status(400).render('pages/user/create-customer', {error : 'İsim ve e-posta alanları zorunludur.'});
        }
  
        const hashedPassword = await bcrypt.hash(customerData.password, 10);
        customerData.password = hashedPassword;
  
        const newCustomer = await User.create(customerData);
        res.redirect('/user/list');
  
      } catch (error) {
        console.error('Kullanıcı oluşturma hatası ile karşılaşıldı : ', error);
        res.status(500).render('pages/user/create-customer', {error : 'Kullanıcı oluşturulamadı. Hatalı bir alan girildi.'});
      }
    });
  }

  static getCreateCustomerPage(req,res) {
    res.render('pages/user/create-customer');
  }

  static async getAllCustomers(req, res) {
    try {
      const { limit = 10, offset = 0 } = req.query;
      const customers = await User.findAll(parseInt(limit), parseInt(offset));      
      res.render('pages/user/list', { customers });
    } catch (error) {
      console.error('Müşterileri getirme hatası:', error);
      res.status(500).render('error', { error: 'Müşteriler getirilirken bir hata oluştu' });
    }
  }

  static async getCustomerById(req, res) {
    console.log("burası mı geliyor lan");
    
    try {
      const { id } = req.params;
      const customer = await User.findByIdWithRoles(id);
      
      if (customer) {
        res.render('pages/user/detail', { customer });
      } else {
        res.status(404).render('pages/user/detail', { error: 'Kullanıcı bulunamadı' });
      }
    } catch (error) {
      console.error('Kullanıcı getirme hatası:', error);
      res.status(500).render('pages/user/detail', { error: 'Kullanıcı getirilirken bir hata oluştu' });
    }
  }

  static async getUpdateCustomerPage (req,res) {
    try {
      const customerId = req.params.id;
      const customer = await User.findByIdWithRoles(customerId);
  
      if (!customer) {
        return res.status(404).render('error', { 
          title: 'Hata',
          message: 'Kullanıcı bulunamadı'
        });
      }
  
      const formattedDateOfBirth = customer.date_of_birth 
        ? new Date(customer.date_of_birth).toISOString().split('T')[0]
        : '';
  
      res.render('pages/user/edit-customer', {
        title: 'Kullanıcı Güncelle',
        customer: {
          ...customer,
          date_of_birth: formattedDateOfBirth
        }
      });
    } catch (error) {
      console.error('Kullanıcı güncelleme sayfası yükleme hatası:', error);
      res.status(500).render('error', {
        title: 'Hata',
        message: 'Kullanıcı güncelleme sayfası yüklenirken bir hata oluştu'
      });
    }
  }

  static async updateCustomer(req, res) {
    upload.single('image')(req, res, async(err) => {
      if(err){
        console.error('File cannot upload on GCS\nerror : ', err);
        return res.status(400).render('pages/user/edit-customer', {
          title: 'Kullanıcı Güncelle',
          customer: { id: req.params.id, ...req.body },
          error: 'Dosya yükleme hatası ile karşılaşıldı'
        });
      }
      try {
        const customerId = req.params.id;
        const existingCustomer = await User.findByIdWithRoles(customerId);
  
        if (!existingCustomer) {
          return res.status(404).render('error', { error: 'Kullanıcı bulunamadı' });
        }
  
        let imageUrl = existingCustomer.image_url;
        if(req.file){
          imageUrl = await uploadToGCS(req.file);
          if (existingCustomer.image_url) {
            await deleteFromGCS(existingCustomer.image_url);
          }
        }
  
        const customerData = {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          date_of_birth: req.body.dateOfBirth || null,
          address: req.body.address,
          city: req.body.city,
          country: req.body.country,
          postal_code: req.body.postalCode,
          gender: req.body.gender,
          image_url: imageUrl
        };
  
        if (req.body.removeImage === 'on') {
          if (existingCustomer.image_url) {
            await deleteFromGCS(existingCustomer.image_url);
          }
          customerData.image_url = null;
        }
  
        if (!customerData.name || !customerData.email) {
          return res.status(400).render('pages/user/edit-customer', {
            title: 'Kullanıcı Güncelle',
            customer: { id: customerId, ...customerData },
            error: 'İsim ve e-posta alanları zorunludur.'
          });
        }
  
        const updatedCustomer = await User.update(customerId, customerData);
        
        if (updatedCustomer) {
          req.flash('success', 'Kullanıcı başarıyla güncellendi.');
          res.redirect(`/user/${customerId}`);
        } else {
          throw new Error('Kullanıcı güncellenemedi.');
        }
  
      } catch (error) {
        console.error('Kullanıcı güncelleme hatası ile karşılaşıldı : ', error);
        res.status(500).render('pages/user/edit-customer', {
          title: 'Kullanıcı Güncelle',
          customer: { id: req.params.id, ...req.body },
          error: 'Kullanıcı güncellenemedi. Hatalı bir alan girildi.'
        });
      }
    });
  }

  static async deleteCustomer(req, res) {
    try {
      const { id } = req.params;
      const deletedCustomer = await User.delete(id);
      if (deletedCustomer) {
        res.redirect('/user/list');
      } else {
        res.status(404).render('error', { error: 'Silinecek Kullanıcı bulunamadı' });
      }
    } catch (error) {
      console.error('Kullanıcı silme hatası:', error);
      res.status(500).render('error', { error: 'Kullanıcı silinirken bir hata oluştu' });
    }
  }

  static async searchCustomersByName(req, res) {
    try {
      const { name } = req.query;
      const customers = await User.searchByName(name);
      res.render('pages/user/search-results', { customers, searchTerm: name });
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      res.status(500).render('error', { error: 'Müşteriler aranırken bir hata oluştu' });
    }
  }

  static async getCustomerCount(req, res) {
    try {
      const count = await User.getCustomerCount();
      res.render('pages/user/count', { count });
    } catch (error) {
      console.error('Kullanıcı sayısı alma hatası:', error);
      res.status(500).render('error', { error: 'Kullanıcı sayısı alınırken bir hata oluştu' });
    }
  }

  

  
}



module.exports = UserController;