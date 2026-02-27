# Admin User Setup

## ✅ Admin Account Created

Your admin account has been successfully seeded to the database!

### 🔑 Admin Credentials

- **Email**: `admin@prepwise.com`
- **Password**: `Admin@123456`
- **User ID**: `VxkaCxBMR7MVWSi8kfUM6AxBJtn1`

### 🚀 Quick Start

1. **Sign In**
   - Go to: http://localhost:3000/sign-in
   - Use the credentials above

2. **Access Admin Dashboard**
   - Navigate to: http://localhost:3000/admin
   - View system statistics, costs, and cache metrics

### 🛡️ Admin Access Configuration

The `.env.local` file has been updated with:
```env
ADMIN_EMAILS="admin@prepwise.com"
```

To add more admin users:
1. Create their accounts normally (sign up)
2. Add their emails to `ADMIN_EMAILS` (comma-separated):
   ```env
   ADMIN_EMAILS="admin@prepwise.com,another.admin@example.com"
   ```
3. Restart the dev server

### 📋 Admin Dashboard Features

- **User Statistics**: Total users, active users
- **Interview Metrics**: Total interviews, completion rates
- **Feedback Analysis**: Average scores, total feedback count
- **API Cost Tracking**: Cost breakdown by model
- **Cache Performance**: Hit rates, valid/expired entries

### 🔄 Re-running the Seed Script

If you need to run the seed script again:
```bash
npm run seed:admin
```

The script is idempotent - it won't create duplicate users if the admin already exists.

### 🔒 Security Notes

⚠️ **Important**: Change the default password after first login!

1. Sign in with the default credentials
2. Go to Profile settings
3. Use "Reset Password" to set a new secure password

---

**Note**: The admin account is already created in both Firebase Auth and Firestore. You can start using it immediately!
