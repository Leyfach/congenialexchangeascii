# Authentication Middleware

## Usage

### Protected Routes
Add `authenticateToken` middleware to routes that require authentication:

```javascript
app.get('/api/orders', authenticateToken, async (req, res) => {
  // Access user via req.user
  const userId = req.user.id;
});
```

### Optional Authentication
Use `optionalAuth` for routes where auth is optional:

```javascript
app.get('/api/public-data', optionalAuth, async (req, res) => {
  // req.user will be null if not authenticated
  if (req.user) {
    // Personalized response
  } else {
    // Public response
  }
});
```

## Headers
Send JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```