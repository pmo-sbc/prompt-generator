/**
 * Gmail Delivery Diagnostic Tool
 * Helps diagnose why emails reach some providers but not Gmail
 */

require('dotenv').config();
const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('\n📧 Gmail Delivery Diagnostic Tool\n');
console.log('=========================================\n');

async function checkDNSRecords(domain) {
  console.log(`🔍 Checking DNS records for: ${domain}\n`);

  try {
    // Check MX records
    console.log('📬 MX Records (Mail Server):');
    try {
      const mxRecords = await dns.resolveMx(domain);
      mxRecords.sort((a, b) => a.priority - b.priority);
      mxRecords.forEach(record => {
        console.log(`   ✅ Priority ${record.priority}: ${record.exchange}`);
      });
    } catch (error) {
      console.log('   ❌ No MX records found');
    }
    console.log('');

    // Check SPF record
    console.log('🛡️  SPF Record (Sender Policy Framework):');
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const spfRecord = txtRecords.find(record =>
        record.join('').startsWith('v=spf1')
      );

      if (spfRecord) {
        console.log(`   ✅ SPF Found: ${spfRecord.join('')}`);

        // Check if current SMTP server is included
        const spfString = spfRecord.join('');
        const smtpHost = process.env.SMTP_HOST;

        if (smtpHost && !spfString.includes(smtpHost) && !spfString.includes('a') && !spfString.includes('mx')) {
          console.log(`   ⚠️  WARNING: Your SMTP server (${smtpHost}) may not be authorized`);
          console.log('   💡 Consider adding: include:${smtpHost} to SPF record');
        }
      } else {
        console.log('   ❌ No SPF record found');
        console.log('   💡 Add SPF record: v=spf1 mx a include:' + process.env.SMTP_HOST + ' ~all');
      }
    } catch (error) {
      console.log('   ❌ Could not check SPF record');
    }
    console.log('');

    // Check DKIM
    console.log('🔐 DKIM Record (DomainKeys Identified Mail):');
    const dkimSelectors = ['default', 'mail', 'k1', 'google', 'dkim', 'selector1', 'selector2'];
    let dkimFound = false;

    for (const selector of dkimSelectors) {
      try {
        const dkimDomain = `${selector}._domainkey.${domain}`;
        const dkimRecords = await dns.resolveTxt(dkimDomain);
        if (dkimRecords.length > 0) {
          console.log(`   ✅ DKIM Found (selector: ${selector})`);
          console.log(`      ${dkimRecords[0].join('').substring(0, 80)}...`);
          dkimFound = true;
          break;
        }
      } catch (error) {
        // Selector not found, continue checking
      }
    }

    if (!dkimFound) {
      console.log('   ❌ No DKIM record found (checked common selectors)');
      console.log('   💡 Contact your email provider to set up DKIM');
    }
    console.log('');

    // Check DMARC
    console.log('📊 DMARC Record (Domain-based Message Authentication):');
    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = dmarcRecords.find(record =>
        record.join('').startsWith('v=DMARC1')
      );

      if (dmarcRecord) {
        console.log(`   ✅ DMARC Found: ${dmarcRecord.join('')}`);
      } else {
        console.log('   ❌ No DMARC record found');
        console.log('   💡 Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain);
      }
    } catch (error) {
      console.log('   ❌ No DMARC record found');
      console.log('   💡 Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain);
    }
    console.log('');

  } catch (error) {
    console.error('Error checking DNS records:', error.message);
  }
}

async function checkIPReputation(ip) {
  console.log(`🌐 IP Reputation Check: ${ip}\n`);

  console.log('📋 Blacklist Checks:');
  console.log('   Visit these sites to check if your IP is blacklisted:\n');
  console.log(`   • https://mxtoolbox.com/SuperTool.aspx?action=blacklist:${ip}`);
  console.log(`   • https://multirbl.valli.org/lookup/${ip}.html`);
  console.log(`   • https://www.spamhaus.org/lookup/`);
  console.log(`   • https://www.barracudacentral.org/lookups`);
  console.log('');
}

async function getPublicIP() {
  try {
    const { stdout } = await execPromise('curl -s ifconfig.me');
    return stdout.trim();
  } catch (error) {
    try {
      const { stdout } = await execPromise('curl -s api.ipify.org');
      return stdout.trim();
    } catch (error2) {
      return null;
    }
  }
}

async function diagnose() {
  // Get email domain
  const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!emailFrom) {
    console.log('❌ EMAIL_FROM or SMTP_USER not found in environment');
    console.log('   Please set these in your .env file\n');
    return;
  }

  const domain = emailFrom.match(/@(.+?)(?:>|$)/)?.[1] || emailFrom.split('@')[1];

  if (!domain) {
    console.log('❌ Could not extract domain from email address\n');
    return;
  }

  console.log(`📧 Email Domain: ${domain}`);
  console.log(`📨 From Address: ${emailFrom}\n`);
  console.log('=========================================\n');

  // Check DNS records
  await checkDNSRecords(domain);

  // Get public IP
  const publicIP = await getPublicIP();
  if (publicIP) {
    await checkIPReputation(publicIP);
  }

  // Gmail-specific recommendations
  console.log('=========================================\n');
  console.log('📧 Gmail Delivery Recommendations:\n');

  console.log('✅ Required for Gmail delivery:\n');
  console.log('1. ✉️  SPF Record configured');
  console.log('2. 🔐 DKIM signing enabled');
  console.log('3. 📊 DMARC policy set');
  console.log('4. 🌐 Clean IP reputation (not blacklisted)');
  console.log('5. 📝 Valid reverse DNS (PTR record)');
  console.log('6. 🔒 TLS encryption enabled');
  console.log('7. 📮 Valid bounce handling');
  console.log('8. ⏰ Consistent sending patterns\n');

  console.log('⚠️  Common reasons Gmail blocks emails:\n');
  console.log('• Missing or incorrect SPF record');
  console.log('• No DKIM signature');
  console.log('• Sending from dynamic/residential IP');
  console.log('• IP on a blacklist');
  console.log('• Low sender reputation');
  console.log('• Suspicious content (too many links, etc.)');
  console.log('• High complaint/bounce rate');
  console.log('• Mismatched From/Reply-To domains\n');

  console.log('=========================================\n');
  console.log('💡 Immediate Solutions:\n');

  console.log('Option 1: Use SMTP Relay Service (RECOMMENDED)');
  console.log('   Gmail and other providers trust these services:\n');
  console.log('   • SendGrid (100 emails/day free)');
  console.log('   • Mailgun (5,000 emails/month free)');
  console.log('   • AWS SES (very cheap, excellent reputation)');
  console.log('   • Postmark (100 emails/month free)\n');

  console.log('Option 2: Configure DNS Records');
  console.log('   Add these records to your domain DNS:\n');

  const smtpHost = process.env.SMTP_HOST;
  console.log(`   SPF:   v=spf1 mx a include:${smtpHost} ~all`);
  console.log(`   DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}\n`);
  console.log('   DKIM:  Contact your email provider for DKIM setup\n');

  console.log('Option 3: Use Authenticated SMTP');
  console.log('   If your hosting provider offers SMTP relay,');
  console.log('   use their SMTP server instead of direct sending\n');

  console.log('=========================================\n');
  console.log('🔧 Testing Tools:\n');
  console.log('• Mail Tester: https://www.mail-tester.com/');
  console.log('  - Send test email and get spam score');
  console.log('');
  console.log('• Google Postmaster: https://postmaster.google.com/');
  console.log('  - Monitor Gmail delivery reputation');
  console.log('');
  console.log('• MXToolbox: https://mxtoolbox.com/');
  console.log('  - Check DNS, blacklists, email headers');
  console.log('');

  console.log('=========================================\n');
}

// Run diagnostics
diagnose().catch(console.error);
