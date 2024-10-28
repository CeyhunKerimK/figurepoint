const User = require('../model/User');

class EmailController {
  static async verifyEmail(req, res) {
    const { token } = req.params;
    try {
      const user = await User.findOne({ emailVerificationToken: token });
      if (!user) {
        return res.render('registration-success', { success: false, message: 'Geçersiz veya süresi dolmuş token.' });
      }

      if (user.isEmailVerified) {
        return res.render('registration-success', { success: true, message: 'E-posta adresiniz zaten doğrulanmış.' });
      }

      if (new Date() > user.emailVerificationExpires) {
        return res.render('registration-success', { success: false, message: 'Doğrulama bağlantısının süresi dolmuş.' });
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save();

      res.render('registration-success', { success: true, message: 'E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilirsiniz.' });
    } catch (error) {
      console.error('E-posta doğrulama hatası:', error);
      res.render('registration-success', { success: false, message: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.' });
    }
  }

  static async sendUpdateNotification(req, res) {
    try {
      const { subject, text, html } = req.body;
      await User.sendUpdateNotification(subject, text, html);
      res.json({ message: 'Bildirimler başarıyla gönderildi.' });
    } catch (error) {
      res.status(500).json({ error: 'Bildirim gönderirken bir hata oluştu.' });
    }
  }

  static async sendVerificationEmail(email, token) {
    console.log(`E-posta gönderme işlemi başlatıldı: ${email}`);
    try {
      const mailOptions = {
        to: email,
        from: process.env.SMTP_USER,
        subject: 'E-posta Adresinizi Doğrulayın',
        text: `Lütfen hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:\n\n
               http://${process.env.APP_URL}/verify-email/${token}\n\n
               Bu bağlantı 24 saat içinde geçerliliğini yitirecektir.`
      };
  
      console.log('Mail seçenekleri hazırlandı');
      
      console.log('Transporter oluşturuluyor...');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        logger: true,
        debug: true
      });
  
      console.log('SMTP bağlantısı kontrol ediliyor...');
      await transporter.verify();
      console.log('SMTP bağlantısı başarılı');
  
      console.log('E-posta gönderiliyor...');
      const info = await transporter.sendMail(mailOptions);
      console.log('E-posta gönderildi:', info.messageId);
      
      return info;
    } catch (error) {
      console.error('E-posta gönderme hatası:', error);
      throw error;
    }
  }
}

module.exports = EmailController;