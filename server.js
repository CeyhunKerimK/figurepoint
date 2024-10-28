const express = require('express');
const session = require('express-session');
const flash = require('express-flash');
require('dotenv').config();
const server = express();
const port = process.env.PORT || 5000;

server.set('view engine', "pug");
server.use(express.static(__dirname + '/public'));

const bodyParser = require('body-parser');
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true })); 

server.use(session({
    secret: process.env.SESSION_SECRET || 'your_fallback_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // HTTP için false, HTTPS için true olmalı
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
    }
}));

// Flash middleware
server.use(flash());

// Veritabanı bağlantısı
require('./utils/dbConnection');

const router = express.Router();
const {
    AuthController,
    HomeController,
    ProductController,
    RoleController,
    UserController,
    DashboardController,
    SellerController,
    EmailController
} = require('./controller/index');
const { isAuthenticated, hasRole, isOwnerOrHasRole } = require('./middleware/authMiddleware');
const authMiddleware = require('./middleware/authMiddleware');
const { sendEmail } = require('./utils/emailService');

// Kök yol için rota
router.get('/', HomeController.getHomePage);

// Dashboard route
router.get('/admin/dashboard', isAuthenticated, DashboardController.getDashboard);

// Public User routes
router.get('/user/register', AuthController.getRegisterPage);
router.post('/user/register', AuthController.register);
router.get('/user/login', AuthController.getLoginPage);
router.post('/user/login', AuthController.login);
router.get('/user/logout', AuthController.logout);
// Password reset routes (public)
router.get('/user/forgot-password', AuthController.getForgotPasswordPage);
router.post('/user/forgot-password', AuthController.forgotPassword);
router.get('/user/reset-password/:token', AuthController.getResetPasswordPage);
router.post('/user/reset-password/:token', AuthController.resetPassword);

// Protected routes
router.use('/user', isAuthenticated);
router.use('/seller',isAuthenticated);

//Role routes
router.get('/user/assign-role', hasRole(['admin']), RoleController.getAssignRolePage);
router.post('/user/assign-role/:id', hasRole(['admin']), RoleController.assignRole);
router.post('/user/:id/update-role', hasRole(['admin']), RoleController.updateRole);

// User routes
router.get('/user/list', hasRole(['admin', 'moderator']), UserController.getAllCustomers);
router.get('/user/search', hasRole(['admin', 'moderator']), UserController.searchCustomersByName);
router.get('/user/count', hasRole(['admin', 'moderator']), UserController.getCustomerCount);
router.get('/user/:id', isOwnerOrHasRole(['admin', 'moderator', 'seller']), UserController.getCustomerById);
router.get('/user/:id/edit', isOwnerOrHasRole(['admin', 'moderator', 'seller']), UserController.getUpdateCustomerPage);
router.post('/user/:id/edit', isOwnerOrHasRole(['admin', 'moderator', 'seller']), UserController.updateCustomer);
router.get('/user/:id/delete', hasRole(['admin']), UserController.deleteCustomer);


// Product routes
router.get('/product/create',isAuthenticated, hasRole(['seller', 'admin']), ProductController.getCreateProductPage);
router.post('/product/create',isAuthenticated, hasRole(['seller', 'admin']), ProductController.createProduct);
router.get('/product/list',isAuthenticated, ProductController.listProducts);
router.post('/product/:id/like', ProductController.toggleLike);
router.post('/product/:id/wishlist', ProductController.toggleWishlist);
router.get('/wishlist', ProductController.getWishlist);
router.get('/product/search',isAuthenticated, ProductController.searchProductsByName);
router.get('/product/count',isAuthenticated, ProductController.getProductCount);
router.get('/product/:id', ProductController.getProductById);
router.get('/product/:id/edit',isAuthenticated, isOwnerOrHasRole(['admin','seller']), ProductController.getUpdateProductPage);
router.post('/product/:id/edit',isAuthenticated, isOwnerOrHasRole(['admin','seller']), ProductController.updateProduct);
router.get('/product/:id/delete',isAuthenticated, isOwnerOrHasRole(['admin','seller']), ProductController.deleteProduct);
router.get('/search', ProductController.searchProducts);

router.get('/seller/dashboard',hasRole(['seller']),SellerController.getSellerDashboard);

router.get('/verify-email/:token', EmailController.verifyEmail);
router.post('/send-update-notification', isAuthenticated, hasRole(['admin', 'seller']), EmailController.sendUpdateNotification);
router.get('/send-test-email', async (req, res) => {
    try {
      const testEmail = process.env.TEST_EMAIL;
      
      if (!testEmail) {
        throw new Error('TEST_EMAIL is not defined in .env file');
      }
  
      console.log('Sending test email to:', testEmail);
  
      await sendEmail(
        testEmail,
        'Test Email from Your App',
        'This is a test email sent from your application.',
        '<h1>Test Email</h1><p>This is a test email sent from your application using Nodemailer.</p>'
      );
  
      res.send(`Test email sent successfully to ${testEmail}. Check your inbox.`);
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).send('Error sending test email: ' + error.message);
    }
  });
server.use('/', router);

server.listen(port, () => {
   console.log(`Application is built successfully ദ്ദി ˉ͈̀꒳ˉ͈́ )✧\nYou can visit on http://localhost:${port}`);
});