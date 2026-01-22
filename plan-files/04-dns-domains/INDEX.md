# 04 - DNS & Domains

DNS configuration and domain verification.

## Files

| File | Description |
|------|-------------|
| `DNS-SETUP.md` | MX records, SPF, DKIM, verification flow |

## DNS Records Summary

### For Receiving (Cloudflare)
```dns
example.com.  MX  10  route1.mx.cloudflare.net.
example.com.  MX  20  route2.mx.cloudflare.net.
```

### For Sending (Brevo)
```dns
example.com.  TXT  "v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all"
```

### Innbox Verification
```dns
_innbox.example.com.  TXT  "innbox-verify=TOKEN"
```

## Next

→ `../05-cloudflare-worker/` for email worker
