const cron = require('node-cron');
const User = require('../models/User');
const { Op } = require('sequelize');

// Her gün gece yarısı çalışacak cron job
const removeUnverifiedUsers = cron.schedule('0 0 * * *', async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 gün önce

    const deletedCount = await User.destroy({
      where: {
        isEmailVerified: false,
        createdAt: {
          [Op.lt]: cutoffDate
        }
      }
    });

    console.log(`${deletedCount} adet doğrulanmamış kullanıcı silindi.`);
  } catch (error) {
    console.error('Doğrulanmamış kullanıcıları silme hatası:', error);
  }
}, {
  scheduled: false
});

module.exports = {
  removeUnverifiedUsers
};