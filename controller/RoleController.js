const User = require('../model/User');
const Role = require('../model/Role');

class RoleController {

    static async updateRole(req, res) {
        try {
          const customerId = req.params.id;
          const { roleIds } = req.body;
      
          const updated = await User.updateRoles(customerId, roleIds);
      
          if (updated) {
            res.json({ success: true, message: 'Roller başarıyla güncellendi' });
          } else {
            res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
          }
        } catch (error) {
          console.error('Rol güncelleme hatası:', error);
          res.status(500).json({ success: false, message: 'Roller güncellenirken bir hata oluştu' });
        }
      }
    
      
    
      static async getAssignRolePage(req, res) {
        try {
          const users = await User.findAllWithRoles();
          const roles = await Role.findAll();
          res.render('pages/admin/role-assign', { users, roles });
        } catch (error) {
          console.error('Kullanıcıları veya rolleri getirme hatası:', error);
          res.status(500).render('error', { 
            title: 'Hata',
            message: 'Veriler getirilirken bir hata oluştu',
            error: error
          });
        }
      }
    
      static async assignRole(req, res) {
        try {
          const { id } = req.params;
          const { roleIds } = req.body;
    
          const roleIdsArray = Array.isArray(roleIds) ? roleIds : [roleIds];
    
          const updated = await User.updateRoles(id, roleIdsArray);
    
          if (updated) {
            req.flash('success', 'Roller başarıyla güncellendi');
          } else {
            req.flash('error', 'Roller güncellenirken bir hata oluştu');
          }
    
          res.redirect('/user/assign-role');
        } catch (error) {
          console.error('Rol atama hatası:', error);
          req.flash('error', 'Rol atama işlemi başarısız oldu');
          res.redirect('/user/assign-role');
        }
      }
}

module.exports = RoleController;