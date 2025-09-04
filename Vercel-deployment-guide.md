# 🚀 Vercel Deployment Guide
## AI-Powered Funding Application System

**Status:** Ready to Deploy!  
**Estimated Time:** 30 minutes  
**Cost:** ~$50/month

---

## ✅ **Pre-Deployment Checklist**

✅ Code updated to use Vercel Blob  
✅ Database schema updated  
✅ Vercel.json configuration created  
✅ Application compiling successfully  
✅ All APIs ready for production  

## 🔧 **Step-by-Step Deployment**

### **Step 1: Create Vercel Account**
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub (recommended for easy repo integration)
3. Verify your email address

### **Step 2: Upload Code to GitHub**
1. Create a new repository on GitHub (public or private)
2. Push your current code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ready for deployment"
   git remote add origin https://github.com/yourusername/nolia-funding-system.git
   git push -u origin main
   ```

### **Step 3: Create Vercel Project**
1. In Vercel dashboard, click "New Project"
2. Import your GitHub repository
3. Configure build settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** Leave empty (Next.js default)
   - **Install Command:** `npm install`

### **Step 4: Set Up Vercel Postgres**
1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database**
3. Select **Postgres**
4. Choose **Hobby** plan (free tier)
5. Create database with name: `nolia-funding-db`
6. **Copy the DATABASE_URL** - you'll need this

### **Step 5: Set Up Vercel Blob**
1. In your Vercel project, go to **Storage** tab  
2. Click **Create Store**
3. Select **Blob**
4. Create with name: `nolia-documents`
5. **Copy the BLOB_READ_WRITE_TOKEN** - you'll need this

### **Step 6: Configure Environment Variables**
1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add these variables:

```bash
# Database
DATABASE_URL=postgresql://... (from Step 4)

# File Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... (from Step 5)

# Node Environment
NODE_ENV=production
```

### **Step 7: Deploy Database Schema**
1. In your Vercel project dashboard, go to **Functions** tab
2. Or use Vercel CLI locally:
   ```bash
   vercel login
   vercel link
   npx prisma db push
   ```

### **Step 8: Deploy Application**
1. Click **Deploy** in Vercel dashboard
2. Wait for build to complete (~3-5 minutes)
3. Your app will be live at: `https://your-project-name.vercel.app`

---

## 🧪 **Testing Your Deployment**

### **Test Document Upload & Analysis**
1. Visit your deployed URL
2. Navigate to `/funding/setup/setup-new-fund`
3. **Step 1:** Upload a PDF or Word document
   - Should analyze and show sections, questions, field types
   - Check that results are consistent (no random numbers)
4. **Step 2:** Upload multiple criteria documents  
   - Should analyze all files together
   - Display weightings, categories, scoring method

### **Test File Storage**
1. Complete the fund setup process
2. Check that files are stored in Vercel Blob
3. Try downloading documents via the API

### **Verify Database**
1. Check Vercel Postgres dashboard
2. Should see `funds` and `fund_documents` tables
3. Verify data is being stored correctly

---

## 🐛 **Common Issues & Solutions**

### **Build Errors**
- **Issue:** Module not found errors
- **Fix:** Make sure all dependencies are in `package.json`
- **Check:** Run `npm install` locally first

### **Database Connection Issues**  
- **Issue:** `DATABASE_URL` not working
- **Fix:** Copy the exact URL from Vercel Postgres settings
- **Note:** Include all parameters (?sslmode=require, etc.)

### **File Upload Issues**
- **Issue:** Files not uploading to Blob
- **Fix:** Check `BLOB_READ_WRITE_TOKEN` in environment variables
- **Verify:** Token has read/write permissions

### **API Timeout Issues**
- **Issue:** Document analysis timing out
- **Fix:** Our `vercel.json` sets 60s timeout for analysis routes
- **Alternative:** Break large documents into smaller chunks

---

## 📊 **Production Monitoring**

### **Key URLs to Bookmark**
- **Live App:** `https://your-project-name.vercel.app`
- **Admin Panel:** `https://vercel.com/dashboard/[project-name]`
- **Database:** `https://vercel.com/dashboard/stores/postgres/[db-id]`
- **Blob Storage:** `https://vercel.com/dashboard/stores/blob/[blob-id]`

### **Important Metrics to Watch**
- **Function Duration:** Document analysis should complete <30s
- **Database Connections:** Monitor for connection pool limits
- **Blob Storage Usage:** Track file upload volume
- **Error Rate:** Monitor API error responses

---

## 💰 **Billing & Limits**

### **Vercel Pro Plan - $20/month**
- 1,000 GB-hours compute time
- 100GB bandwidth  
- 12 serverless functions
- Unlimited deployments

### **Vercel Postgres - ~$20/month**
- 500MB storage (Hobby)
- 1GB bandwidth
- 10 concurrent connections

### **Vercel Blob - ~$10/month**
- 10GB storage
- 100GB bandwidth
- Unlimited file operations

### **Expected Usage (MVP)**
- **Functions:** Document analysis APIs (~200 GB-hours/month)
- **Database:** Fund & document metadata (~100MB)
- **Storage:** PDF/Word files (~5GB monthly growth)

---

## 🔄 **Post-Deployment Tasks**

### **Immediate (Day 1)**
- [ ] Test all document upload workflows
- [ ] Verify email notifications work
- [ ] Check all API endpoints respond correctly
- [ ] Monitor error logs in Vercel dashboard

### **Week 1**  
- [ ] Set up custom domain (optional)
- [ ] Configure HTTPS redirects
- [ ] Set up monitoring alerts
- [ ] Create backup strategy for database

### **Month 1**
- [ ] Review usage metrics vs. billing limits
- [ ] Optimize any slow API endpoints  
- [ ] Plan database scaling if needed
- [ ] Consider adding authentication (Auth0)

---

## 🎯 **Success Criteria**

Your deployment is successful when:
- ✅ Application loads at your Vercel URL
- ✅ Document upload works in Steps 1 & 2
- ✅ Analysis shows real content (not random data)
- ✅ Files are stored and retrievable
- ✅ Database contains fund and document records
- ✅ No critical errors in Vercel logs

---

## 🔧 **Next Phase: Adding RAG Assessment**

Once your document management system is live and tested, we can add the AI assessment features:

1. **Add Claude API integration** for intelligent assessment
2. **Add vector database** (Pinecone) for semantic search  
3. **Build RAG pipeline** for criteria matching
4. **Create assessment scoring** interface

**Estimated additional development time:** 2-3 days  
**Additional monthly cost:** ~$200 (Claude API + Pinecone)

---

## 📞 **Need Help?**

If you encounter any issues during deployment:
1. Check Vercel deployment logs first
2. Verify all environment variables are set correctly  
3. Test locally with production environment variables
4. Check this guide's troubleshooting section

**Your system is ready to launch! 🎉**