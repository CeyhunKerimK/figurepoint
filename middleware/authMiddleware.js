const User = require('../model/User');

const authMiddleware = {
  
  isAuthenticated: async function(req, res, next) {
    if (req.session.userId) {
      try {
        const user = await User.findById(req.session.userId);
        if (user) {
          const userRoles = await User.getUserRoles(user.id);
          user.roles = userRoles.map(role => role.name);
          req.user = user;
          res.locals.user = user;
          next();
        } else {
          res.redirect('/user/login');
        }
      } catch (err) {
        console.error('Kullanıcı arama hatası:', err);
        res.redirect('/user/login');
      }
    } else {
      res.redirect('/user/login');
    }
  },

  hasRole: function(roles) {
    return function(req, res, next) {
      if (req.user && req.user.roles.some(role => roles.includes(role))) {
        next();
      } else {
        res.status(403).render("pages/dashboard", {
          error: "Bu işlemi yapmak için yetkiniz yok."
        });
      }
    }
  },

  isOwnerOrHasRole: function(roles) {
    return function(req, res, next) {
      if (req.user && (req.user.id === parseInt(req.params.id) || req.user.roles.some(role => roles.includes(role)))) {
        next();
      } else {
        res.status(403).render("pages/dashboard", {
          error: "Bu işlemi yapmak için yetkiniz yok."
        });
      }
    }
  },

  isSeller: function(req, res, next) {
    if (req.user && req.user.roles.includes('seller')) {
      next();
    } else {
      res.status(403).render("pages/dashboard", {
        error: "Bu işlemi yapmak için satıcı olmanız gerekiyor."
      });
    }
  }
};

module.exports = authMiddleware;