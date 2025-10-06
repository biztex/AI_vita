# Supabase Authentication Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API

### 3. Environment Variables
Create a `.env.local` file in your project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Run this SQL in your Supabase SQL editor to create user profiles table:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription TEXT DEFAULT 'integrated' CHECK (subscription IN ('vitaai', 'execuwell', 'integrated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, company, role, subscription)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'company',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'subscription', 'integrated')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 🔧 Features Implemented

### ✅ Authentication Functions
- **Sign Up**: Email/password registration with metadata
- **Sign In**: Email/password authentication
- **Sign Out**: Secure logout
- **Password Reset**: Email-based password reset
- **Session Management**: Automatic session handling

### ✅ User Management
- **User Profiles**: Extended user data storage
- **Role-based Access**: User and admin roles
- **Company Information**: Optional company field
- **Subscription Types**: VitaAI, ExecuWell, or Integrated

### ✅ Security Features
- **Row Level Security**: Database-level security
- **JWT Tokens**: Secure authentication tokens
- **Session Persistence**: Automatic session restoration
- **Real-time Updates**: Auth state synchronization

## 🎯 Next Steps

1. **Install Supabase**: Run `npm install @supabase/supabase-js`
2. **Set Environment Variables**: Add your Supabase credentials
3. **Run Database Setup**: Execute the SQL commands above
4. **Test Authentication**: Try login/register functionality

## 🔍 Testing

After setup, you can test with:
- **Register**: Create new accounts
- **Login**: Sign in with existing accounts
- **Profile**: View user information
- **Logout**: Sign out securely

## 📝 Notes

- The auth context automatically handles Supabase sessions
- User metadata is stored in both Supabase auth and profiles table
- All authentication is handled client-side with proper error handling
- The system supports both regular users and admin roles
