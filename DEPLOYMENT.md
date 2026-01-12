# 🚀 Vercel Deployment Checklist

## ✅ Pre-Deployment Steps Completed

- [x] Database migrated to Supabase
- [x] Edge functions deployed
- [x] Storage bucket configured
- [x] Users created and roles assigned
- [x] Test data uploaded
- [x] Certificates working
- [x] Unnecessary files removed
- [x] .gitignore updated

---

## 📋 Deployment Steps

### 1. **Create GitHub Repository**

```bash
cd /home/arthur/Downloads/intern-portal-prototype-final-main

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Intern Portal with Supabase backend"

# Create repo on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

### 2. **Deploy to Vercel**

1. Go to: https://vercel.com
2. Click **"New Project"**
3. **Import** your GitHub repository
4. Vercel will auto-detect it's a Vite project

---

### 3. **Configure Environment Variables in Vercel**

⚠️ **IMPORTANT**: Add these in Vercel Dashboard → Project Settings → Environment Variables

```
VITE_SUPABASE_PROJECT_ID=kfkwcdjxrbdtsmihckjx
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma3djZGp4cmJkdHNtaWhja2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTc5MTcsImV4cCI6MjA4MzczMzkxN30.phuB38WbZ0bHA0m882HyXuzpRuZst1UrgQPGwWVB7LM
VITE_SUPABASE_URL=https://kfkwcdjxrbdtsmihckjx.supabase.co
```

**How to add:**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable above
4. Apply to: **Production, Preview, Development**
5. Click **"Save"**

---

### 4. **Deploy!**

Click **"Deploy"** in Vercel

Vercel will:
- ✅ Install dependencies (`npm install`)
- ✅ Build the project (`npm run build`)
- ✅ Deploy to production
- ✅ Give you a live URL

---

## 🔧 Production Checklist

### After First Deployment:

- [ ] Test login with all 3 user types (admin, faculty, student)
- [ ] Verify departments are showing
- [ ] Test creating internships
- [ ] Test student applications
- [ ] Test certificate upload and viewing
- [ ] Check Certificate Centre is working
- [ ] Verify email notifications (if configured)
- [ ] Test on mobile devices
- [ ] Check all pages load correctly

---

## 🌐 Post-Deployment Configuration

### 1. **Add Custom Domain (Optional)**
- Vercel Settings → Domains
- Add your custom domain
- Update DNS records

### 2. **Configure Supabase Redirect URLs**
- Go to: https://supabase.com/dashboard/project/kfkwcdjxrbdtsmihckjx/auth/url-configuration
- Add your Vercel URL to **Redirect URLs**:
  - `https://your-app.vercel.app/**`
  - `https://your-custom-domain.com/**` (if using custom domain)

### 3. **Update Site URL**
- Set **Site URL** in Supabase Auth settings to your Vercel URL

---

## 📊 Performance Optimization

Already configured in your project:
- ✅ Vite for fast builds
- ✅ React lazy loading
- ✅ Image optimization
- ✅ Code splitting
- ✅ Supabase edge functions for backend

---

## 🔒 Security Notes

**DO NOT** commit to Git:
- ❌ `.env` file (already in .gitignore)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` (only use in edge functions)
- ❌ Database passwords
- ❌ API secrets

**Safe to commit:**
- ✅ `VITE_SUPABASE_URL` (public)
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` (public anon key)
- ✅ `VITE_SUPABASE_PROJECT_ID` (public)

---

## 🐛 Troubleshooting

### Build Fails:
```bash
# Test build locally first
npm run build

# If errors, check:
- TypeScript errors
- Missing dependencies
- Environment variables
```

### Auth Not Working:
- Check Supabase redirect URLs are configured
- Verify environment variables in Vercel
- Check Site URL in Supabase

### Images Not Loading:
- Verify Supabase Storage bucket is public or has correct RLS
- Check certificate URLs in database
- Verify blob URL implementation

---

## 📈 Monitoring

### Vercel Analytics (Free):
- Automatic in Vercel dashboard
- See traffic, performance, errors

### Supabase Logs:
- https://supabase.com/dashboard/project/kfkwcdjxrbdtsmihckjx/logs
- Monitor database queries
- Check edge function logs
- Track storage usage

---

## 🚀 Quick Deploy Commands

```bash
# If you make changes later:
git add .
git commit -m "Your commit message"
git push

# Vercel will auto-deploy on push to main branch
```

---

## ✅ Final Checklist Before Going Live

- [ ] All environment variables set in Vercel
- [ ] Supabase redirect URLs configured
- [ ] Test all features in production
- [ ] Check mobile responsiveness
- [ ] Verify email notifications work
- [ ] Test with real users (admin, faculty, student)
- [ ] Monitor for errors in first 24 hours
- [ ] Set up Vercel analytics
- [ ] Document any production issues

---

**You're ready to deploy!** 🎉

Run the Git commands above, push to GitHub, then deploy on Vercel!
