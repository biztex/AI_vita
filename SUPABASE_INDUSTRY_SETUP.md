# Industry Preferences Setup Guide

## Overview

This feature allows users to select their industry interests during registration, and receive personalized news filtered by those industries. News items are automatically tagged with relevant industries using AI.

## Database Migration

### 1. Update Supabase profiles table (if using Supabase)

Run this SQL in your Supabase SQL editor:

```sql
-- Add industries column to profiles table (array of text)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}';

-- Update the handle_new_user function to include industries
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, company, role, subscription, industries)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'company',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'subscription', 'integrated'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'industries')),
      ARRAY[]::TEXT[]
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Run Prisma Migration

The Prisma schema has been updated to include:
- `industries` field in `AppUser` model (array of `Industry` enum)
- `industries` field in `NewsItem` model (array of `Industry` enum)
- `Industry` enum with 8 industry types

Run the migration:

```bash
cd backend
npx prisma migrate dev --name add_industry_preferences
npx prisma generate
```

### 3. Backend API Sync

The backend auth middleware (`backend/src/middlewares/auth.ts`) automatically syncs industries from Supabase user metadata to Prisma AppUser table when users authenticate. No additional API endpoints are needed.

## Industry Values

The following industry values are supported:
- `MANUFACTURING` - 製造業
- `IT_TECHNOLOGY` - IT・テクノロジー
- `HEALTHCARE_WELFARE` - 医療・福祉
- `RETAIL_SERVICE` - 小売・サービス
- `FINANCE_INSURANCE` - 金融・保険
- `REAL_ESTATE_BUILDING` - 不動産・建築
- `EDUCATION_HUMAN_RESOURCES` - 教育・人材
- `GENERAL` - その他・一般

## Features

1. **User Registration**: Users can select multiple industries during registration
2. **AI Industry Tagging**: News items are automatically tagged with relevant industries using AI
3. **Personalized News**: Users receive news filtered by their selected industries
4. **Industry-organized Email**: News emails are organized by industry for better readability

## Backend API

The backend needs to sync industries from Supabase auth metadata to Prisma AppUser table. You may need to create an endpoint or webhook to handle this sync.

