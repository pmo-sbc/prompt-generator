# reCAPTCHA Setup Guide

This application uses Google reCAPTCHA v2 to protect sign up, login, and password reset forms from bots.

## Getting Your reCAPTCHA Keys

1. **Go to Google reCAPTCHA Admin Console**:
   - Visit: https://www.google.com/recaptcha/admin/create

2. **Register a New Site**:
   - **Label**: Your app name (e.g., "AI Prompt Templates")
   - **reCAPTCHA type**: Select **"reCAPTCHA v2"** → **"I'm not a robot" Checkbox**
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - Your production domain (e.g., `yourdomain.com`)
   - Accept the Terms of Service
   - Click **Submit**

3. **Copy Your Keys**:
   - **Site Key**: Public key used on frontend
   - **Secret Key**: Private key used on backend

## Configuration

Add these keys to your `.env` file:

```env
# reCAPTCHA Configuration
RECAPTCHA_ENABLED=true
RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

### Development Mode

For development/testing, you can disable reCAPTCHA:

```env
RECAPTCHA_ENABLED=false
```

## Testing

### Test Keys (for localhost only)

Google provides test keys that always pass:

```env
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe
```

**Note**: These test keys will show a warning and always return success. Use only for testing!

## Protected Endpoints

The following endpoints are protected with reCAPTCHA:

- `/api/register` - User registration
- `/api/login` - User login
- `/api/forgot-password` - Password reset requests

## Troubleshooting

### CAPTCHA Not Showing

1. Check that `RECAPTCHA_ENABLED=true` in `.env`
2. Verify your site key is correct
3. Check browser console for errors
4. Ensure your domain is registered in reCAPTCHA admin

### Verification Failing

1. Verify your secret key is correct
2. Check server logs for error messages
3. Ensure the domain matches your registered domain
4. Make sure you're not using test keys in production

### Rate Limiting

Even with reCAPTCHA, rate limiting is still active:
- Email-sending endpoints: 3 requests per 15 minutes per IP
- Authentication endpoints: Based on your security settings

## Security Notes

- Never expose your **Secret Key** in frontend code
- Always validate reCAPTCHA on the backend
- Consider using reCAPTCHA v3 for invisible protection (requires code changes)
- Monitor your reCAPTCHA analytics in the admin console

## Support

For more information, visit:
- Google reCAPTCHA Docs: https://developers.google.com/recaptcha/docs/display
- reCAPTCHA Admin: https://www.google.com/recaptcha/admin
