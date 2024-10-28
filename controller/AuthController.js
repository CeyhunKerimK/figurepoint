const Role = require('../model/Role');
const User = require('../model/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');

const nodemailer = require('nodemailer');
class AuthController {
    static async getForgotPasswordPage(req, res) {
        res.render('auth/forgot-password', { title: 'Şifremi Unuttum' });
    }
    
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const customer = await User.findByEmail(email);
            
            if (!customer) {
                return res.render('auth/forgot-password', { title: 'Şifremi Unuttum', error: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.' });
            }
    
            const resetToken = crypto.randomBytes(20).toString('hex');
            const resetTokenExpiration = Date.now() + 3600000; // 1 saat
    
            await User.updateResetToken(customer.id, resetToken, resetTokenExpiration);
    
            const resetUrl = `http://${req.headers.host}/auth/reset-password/${resetToken}`;
            await sendEmail(customer.email, 'Şifre Sıfırlama', `Şifrenizi sıfırlamak için bu linke tıklayın: ${resetUrl}`);
    
            res.render('auth/forgot-password', { title: 'Şifremi Unuttum', message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' });
        } catch (error) {
            console.error('Şifre sıfırlama hatası:', error);
            res.status(500).render('auth/forgot-password', { title: 'Şifremi Unuttum', error: 'Şifre sıfırlama işlemi başarısız oldu.' });
        }
    }
    
    static async getResetPasswordPage(req, res) {
        const { token } = req.params;
        res.render('auth/reset-password', { title: 'Şifre Sıfırla', token });
    }
    
    static async resetPassword(req, res) {
        try {
            const { token } = req.params;
            const { password, confirmPassword } = req.body;
    
            if (password !== confirmPassword) {
                return res.render('auth/reset-password', { title: 'Şifre Sıfırla', token, error: 'Şifreler eşleşmiyor.' });
            }
    
            const customer = await User.findByResetToken(token);
            if (!customer || customer.resetTokenExpiration < Date.now()) {
                return res.render('auth/reset-password', { title: 'Şifre Sıfırla', token, error: 'Geçersiz veya süresi dolmuş token.' });
            }
    
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.updatePassword(customer.id, hashedPassword);
    
            res.render('auth/login', { title: 'Giriş Yap', message: 'Şifreniz başarıyla sıfırlandı. Şimdi giriş yapabilirsiniz.' });
        } catch (error) {
            console.error('Şifre sıfırlama hatası:', error);
            res.status(500).render('auth/reset-password', { title: 'Şifre Sıfırla', token: req.params.token, error: 'Şifre sıfırlama işlemi başarısız oldu.' });
        }
    }
    
    static async getRegisterPage(req, res) {
        res.render('auth/register', { title: 'Kayıt Ol' });
    }
    
    static async register(req, res) {
        const { name, email, password } = req.body;
        try {
            const user = await User.create({
                name,
                email,
                password
            });
            
            res.redirect('/auth/login');
        } catch (error) {
            console.error('Kayıt hatası:', error);
            res.status(500).render('error', { message: 'Kayıt sırasında bir hata oluştu.' });
        }
    }
    
    static async getLoginPage(req, res) {
        res.render('auth/login', { title: 'Giriş Yap' });
    }
    
    static async login(req, res) {
        try {
          const { email, password } = req.body;
          
          if (!email || !password) {
            return res.status(400).render('pages/auth/login', { title: 'Giriş Yap', error: 'E-posta ve şifre alanları zorunludur.' });
          }
          
          
          
          const customer = await User.findByEmail(email);
          if (customer && await bcrypt.compare(password, customer.password)) {
            req.session.userId = customer.id;
            res.redirect('/');
          } else {
            res.render('pages/auth/login', { title: 'Giriş Yap', error: 'Geçersiz e-posta veya şifre.' });
          }
        } catch (error) {
          console.error('Giriş hatası:', error);
          res.status(500).render('pages/auth/login', { title: 'Giriş Yap', error: 'Giriş işlemi başarısız oldu.' });
        }
      }
    
    static async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Oturum kapatma hatası:', err);
                return res.redirect('/');
            }
            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    }
}

module.exports = AuthController;