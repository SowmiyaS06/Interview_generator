# Firestore Setup & Migration Guide

This guide will help you set up all the necessary Firestore collections and indexes for the new advanced features.

## Collections to Create

### 1. Interview Management
- **interview_sessions** - Tracks interview sessions with multiple attempts
- **interview_attempts** - Individual interview attempts with scores and transcripts
- **interview_recordings** - Audio/video recordings and transcripts

### 2. Performance & Analytics
- **performance_metrics** - Speaking pace, filler words, confidence scores
- **feedback** - Interview feedback and scores (existing, may need updates)

### 3. User Learning & Goals
- **interview_goals** - User's interview preparation goals
- **goal_milestones** - Milestones within each goal
- **learning_plans** - Learning resources and study plans

### 4. Notes & Organization
- **interview_notes** - User notes on specific interviews
- **interview_bookmarks** - Bookmarked questions and important points
- **interview_tags** - Custom tags for organizing interviews
- **saved_searches** - Saved search filters

### 5. Company Tracking
- **company_profiles** - Company information and interview styles
- **company_interviews** - Specific interviews at each company

### 6. Notifications
- **notifications** - System notifications for users
- **notification_preferences** - User notification settings

### 7. Scoring & Evaluation
- **scoring_rubrics** - Custom scoring rubrics for interviews
- **rubric_applications** - Records of rubric applications

### 8. Gamification
- **user_achievements** - Unlocked achievements
- **user_levels** - User level and XP points
- **user_streaks** - Interview streak tracking

### 9. Mentorship
- **mentor_profiles** - Mentor information and expertise
- **mentor_review_requests** - Review requests from users

### 10. Job Descriptions & Parsing
- **parsed_job_descriptions** - Parsed job descriptions with analysis
- **benchmark_data** - Role/level performance benchmarks

### 11. Developer Features
- **api_keys** - API key management (hashed storage)
- **webhook_subscriptions** - Webhook event subscriptions

## Firestore Indexes

The project includes optimized Firestore indexes in `firebase/firestore.indexes.json`. These indexes ensure fast queries for:

- User-specific data filtering
- Score range filtering
- Date range filtering
- Status filtering
- Multi-field compound queries

## Setting Up Indexes

### Option 1: Using Firebase CLI
\`\`\`bash
firebase deploy --only firestore:indexes
\`\`\`

### Option 2: Manual Setup in Firebase Console
1. Go to Firebase Console → Firestore Database → Indexes
2. Create a new composite index for each entry in `firestore.indexes.json`
3. Match the exact field order and sort direction

## Environment Variables Required

\`\`\`env
# OpenAI/OpenRouter for AI features
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=openai/gpt-4o-mini

# Firebase (usually already set up)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (backend only)
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
\`\`\`

## Data Migration Steps

### Step 1: Deploy Backend Code
1. Push all server action files from `lib/actions/` to production
2. Ensure environment variables are set

### Step 2: Create Collections
Collections will be auto-created when data is first written. You can pre-create them in Firebase Console for organization.

### Step 3: Deploy Indexes
\`\`\`bash
firebase deploy --only firestore:indexes
\`\`\`

### Step 4: Test Features
1. Create a test goal: `/goals`
2. Verify goal creation appears in Firestore
3. Check performance metrics: `/performance`
4. Test search functionality: `/search`

## Collection Structure Reference

### interview_goals
\`\`\`json
{
  "userId": "user_id",
  "title": "Master System Design",
  "description": "...",
  "targetScore": 85,
  "currentScore": 0,
  "progress": 0,
  "status": "in_progress",
  "category": "technical",
  "priority": "high",
  "deadline": "2024-12-31",
  "createdAt": "2024-11-15T10:00:00Z",
  "updatedAt": "2024-11-15T10:00:00Z"
}
\`\`\`

### performance_metrics
\`\`\`json
{
  "userId": "user_id",
  "interviewId": "interview_id",
  "speakingPace": "normal",
  "fillerWords": {
    "count": 5,
    "percentage": 8.5,
    "examples": ["um", "uh", "like"]
  },
  "confidenceScore": 78,
  "clarityScore": 82,
  "coherenceScore": 75,
  "pauseAnalysis": {
    "total": 12,
    "thoughtful": 8,
    "hesitant": 4
  },
  "createdAt": "2024-11-15T10:00:00Z"
}
\`\`\`

### user_achievements
\`\`\`json
{
  "userId": "user_id",
  "achievementId": "first_interview",
  "name": "Getting Started",
  "description": "Complete your first interview",
  "icon": "🚀",
  "unlockedAt": "2024-11-15T10:00:00Z"
}
\`\`\`

## Backup & Recovery

### Regular Backups
Enable automated daily backups in Firebase Console:
1. Firestore → Backups
2. Create a scheduled backup (recommend daily at 2 AM UTC)

### Manual Backup
\`\`\`bash
gcloud firestore export gs://your-bucket/backup-2024-11-15
\`\`\`

## Security Rules Update Needed

Add these to your Firestore security rules:

\`\`\`javascript
// Goals - user can only access their own
match /interview_goals/{document=**} {
  allow read, write: if request.auth.uid == resource.data.userId || 
                        request.auth.uid == request.resource.data.userId;
}

// Performance metrics - read own data
match /performance_metrics/{document=**} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if request.auth.uid == request.resource.data.userId;
}

// API Keys - write restricted
match /api_keys/{document=**} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update, delete: if false;
}

// Similar patterns for other user-specific collections
\`\`\`

## Troubleshooting

### Indexes Not Ready
**Problem**: "The query requires an index" error
**Solution**: 
1. Check Firebase Console for index status
2. Wait for index to be built (can take 5-15 minutes)
3. For testing, disable index requirement: `firebase emulators:start`

### Missing Data
**Problem**: Collections appear empty in Firestore
**Solution**:
1. Verify Firebase permissions are set correctly
2. Check that environment variables are loaded
3. Test with a simple create operation first

### Performance Is Slow
**Problem**: Queries are returning slowly
**Solution**:
1. Verify composite indexes exist for your query filters
2. Check if you're missing a database index
3. Consider pagination for large result sets

## Monitoring

### Firestore Metrics
Monitor in Firebase Console:
- Database → Monitoring → Real-time metrics
- Check reads/writes/deletes per day
- Monitor storage usage

### Cost Estimation
- Free tier: 50k reads, 20k writes, 20k deletes/day
- Paid tier: $0.06/100k reads, $0.18/100k writes, $0.02/100k deletes

## Next Steps

1. ✅ Deploy all server actions from `lib/actions/`
2. ✅ Create Firestore indexes
3. ✅ Update security rules
4. ✅ Test each feature on staging
5. 📋 Configure CI/CD for automated index deployment
6. 📋 Set up monitoring alerts
7. 📋 Create backup schedules

## Support

For Firebase documentation: https://firebase.google.com/docs/firestore
For Next.js integration: https://nextjs.org/docs
