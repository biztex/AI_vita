# Supabase JWT Verification Setup Guide

## Environment Variables Required

For the backend to verify Supabase JWT tokens, you need to set the following environment variables:

### 1. SUPABASE_JWKS_URL
The JWKS (JSON Web Key Set) endpoint URL from your Supabase project.

**Format:**
```
https://<your-project-ref>.supabase.co/.well-known/jwks.json
```

**Example:**
```
SUPABASE_JWKS_URL=https://veputwboiicjfimhdjsk.supabase.co/.well-known/jwks.json
```

### 2. SUPABASE_ISSUER
The issuer URL for your Supabase project.

**Format:**
```
https://<your-project-ref>.supabase.co/auth/v1
```

**Example:**
```
SUPABASE_ISSUER=https://veputwboiicjfimhdjsk.supabase.co/auth/v1
```

### 3. SUPABASE_AUDIENCE
The JWT audience. For Supabase user tokens, this is typically:
- The JWT secret from your Supabase project settings (Settings > API > JWT Secret)
- Or can be set to `authenticated` for user tokens
- Or can be omitted (leave empty) if audience validation is not required

**To find your JWT Secret:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Find the "JWT Secret" field
4. Copy the value

**Example:**
```
SUPABASE_AUDIENCE=your-jwt-secret-here
```

## How to Get Your Supabase Project Reference

1. Go to your Supabase project dashboard
2. Look at the URL - it will be something like: `https://app.supabase.com/project/veputwboiicjfimhdjsk`
3. The project reference is the last part: `veputwboiicjfimhdjsk`
4. Or check your `NEXT_PUBLIC_SUPABASE_URL` - it will be: `https://veputwboiicjfimhdjsk.supabase.co`

## Testing the Configuration

### Test JWKS Endpoint
You can test if your JWKS URL is correct by visiting it in a browser:
```
https://<your-project-ref>.supabase.co/.well-known/jwks.json
```

You should see a JSON response with keys.

### Test with curl
```bash
curl https://<your-project-ref>.supabase.co/.well-known/jwks.json
```

## Common Issues

### Error: "Unsupported alg value for a JSON Web Key Set"
This error typically occurs when:
1. The JWKS URL is incorrect or not accessible
2. The JWKS endpoint returns keys in an unexpected format
3. The jose library version doesn't support the algorithm in the JWKS

**Solution:**
1. Verify the JWKS URL is correct and accessible
2. Check that the JWKS endpoint returns valid JSON
3. Ensure your Supabase project is active and accessible

### Error: "Invalid token"
This can occur when:
1. The issuer doesn't match
2. The audience doesn't match (if required)
3. The token is expired
4. The token signature is invalid

**Solution:**
1. Verify SUPABASE_ISSUER matches the token's issuer
2. Check SUPABASE_AUDIENCE matches (or remove it if not needed)
3. Ensure the token is not expired
4. Verify the JWKS endpoint is accessible

## Backend .env File Example

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=your-database-url

# Redis
REDIS_URL=your-redis-url

# Supabase JWT Verification
SUPABASE_JWKS_URL=https://veputwboiicjfimhdjsk.supabase.co/.well-known/jwks.json
SUPABASE_ISSUER=https://veputwboiicjfimhdjsk.supabase.co/auth/v1
SUPABASE_AUDIENCE=your-jwt-secret-here

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

## Verification

After setting up the environment variables, restart your backend server and try to register a user. Check the backend logs for:
- `[AUTH] Initializing JWKS from: ...`
- `[AUTH] Token verified successfully`

If you see errors, check the error message and verify your environment variables are correct.

