# 3rd Rock Ads Landing Page

Professional static landing page for www.3rdrockads.com

## Overview

This is a modern, responsive landing page that promotes the AI-Powered Prompt Templates service. Built with pure HTML, CSS, and vanilla JavaScript for optimal performance and easy deployment.

## Features

- **Fully Responsive** - Works perfectly on desktop, tablet, and mobile
- **Modern Design** - Clean, professional UI with smooth animations
- **Fast Loading** - No heavy frameworks, pure vanilla code
- **SEO Optimized** - Proper meta tags and semantic HTML
- **Smooth Scrolling** - Enhanced user experience with animated elements
- **Mobile Menu** - Touch-friendly navigation for mobile devices

## Structure

```
3rdrockads-landing/
├── index.html       # Main HTML file
├── styles.css       # All styles and responsive design
├── script.js        # JavaScript for interactivity
└── README.md        # This file
```

## Deployment Options

### Option 1: Deploy to Static Hosting (Recommended)

#### **Netlify** (Easiest)
1. Create a free account at https://netlify.com
2. Drag and drop the `3rdrockads-landing` folder
3. Set custom domain to www.3rdrockads.com
4. Done! Automatic HTTPS included

#### **Vercel**
1. Create account at https://vercel.com
2. Import from Git or drag and drop
3. Configure domain
4. Deploy

#### **GitHub Pages**
1. Create a new repository
2. Upload files
3. Go to Settings → Pages
4. Enable GitHub Pages
5. Configure custom domain

### Option 2: Deploy on Your Own Server

#### **Upload via FTP/SFTP**
```bash
# Upload files to your web server
scp -r 3rdrockads-landing/* user@yourserver.com:/var/www/3rdrockads.com/
```

#### **Using Nginx**
```nginx
server {
    listen 80;
    server_name www.3rdrockads.com 3rdrockads.com;

    root /var/www/3rdrockads.com;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

#### **Using Apache**
```apache
<VirtualHost *:80>
    ServerName www.3rdrockads.com
    ServerAlias 3rdrockads.com
    DocumentRoot /var/www/3rdrockads.com

    <Directory /var/www/3rdrockads.com>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Option 3: Integrate with Existing Server

Since you already have a Node.js server running, you can serve the landing page from your existing server:

```javascript
// In your server.js
const path = require('path');

// Serve landing page as the main site
app.use(express.static(path.join(__dirname, '3rdrockads-landing')));

// Your app routes (dashboard, templates, etc.) stay the same
app.use('/dashboard', dashboardRoutes);
app.use('/templates', templateRoutes);
// ... etc
```

## Customization

### Update Logo
Replace the logo reference in both HTML and CSS:
```html
<img src="../public/images/3rd-logo.jpeg" alt="3rd Rock Ads Logo">
```

### Update Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --primary-color: #e74c3c;
    --primary-dark: #c0392b;
    --secondary-color: #3498db;
    /* ... */
}
```

### Update Content
Edit `index.html` to change:
- Headings and descriptions
- Features and benefits
- Pricing tiers
- Contact information
- Footer links

### Update Links
Make sure all links point to your actual app:
- `/signup` - Registration page
- `/login` - Login page
- `/dashboard` - User dashboard
- `/templates` - Template browser

## Link Structure

The landing page links to your main application:
- **Get Started / Sign Up** → `/signup`
- **Login** → `/login`
- **Browse Templates** → `/templates`
- **Dashboard** → `/dashboard`

## Performance

- No external dependencies (except Google Fonts)
- Minimal CSS (< 20KB)
- Minimal JS (< 5KB)
- Optimized images
- Fast load times (< 1s)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## SEO

The page includes:
- Proper meta tags
- Semantic HTML5
- Alt tags for images
- Structured content
- Fast loading times

## Analytics Integration (Optional)

Add Google Analytics by inserting this before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-GA-ID');
</script>
```

## Support

For questions or issues, contact: support@3rdrockads.com

## License

© 2025 3rd Rock Ads. All rights reserved.
