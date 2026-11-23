---
title: "Middlemen: and why we never click Advanced > Proceed"
description: Who can sit between a client and a server, the legitimate middlemen we run ourselves, and why certificate warnings must always mean something.
---

A **middleman** (man-in-the-middle, MITM) is anything that sits between the client and the server and can see or change the traffic. TLS exists to make middlemen harmless. Certificate checks are the part that does it.

If you haven't met Sally (server), Chris (client) and Mallory (attacker) yet, read [TLS and trust](/pki-tls/tls-trust/) first.

## Malicious middlemen

| How Mallory gets in the middle | Example |
|---|---|
| **Rogue Wi-Fi** | A hotspot named like the café's or the council's guest network |
| **ARP spoofing** | A compromised PC on the same VLAN tells everyone "I'm the gateway" |
| **DNS poisoning** | `app.rrc.qld.gov.au` is made to resolve to Mallory's IP |
| **Compromised device** | A hacked router, switch, proxy or hypervisor host |
| **Malicious proxy settings** | Malware sets the PC's proxy to Mallory's server |

In every case, Mallory can see and forward the traffic. What she **can't** do is present a certificate for `app.rrc.qld.gov.au` that Chris trusts, because she doesn't have Sally's private key and no CA will issue her one. So Chris's browser shows a warning.

**That warning is the only thing standing between the user and Mallory.**

## Why "Advanced > Proceed" is so bad

When a user clicks through a certificate warning, they're telling the browser: "I don't care who's on the other end."

- If it's a **misconfigured** internal server, nothing bad happens this time.
- If it's **Mallory**, the user has just handed over their password, session and data.

The browser can't tell the difference, and **neither can the user**. Both warnings look identical.

So every time we leave an internal site with a self-signed, expired or wrong-name certificate and tell people "just click Advanced, it's fine", we're **training users to click through the one warning that protects them from a real attack**. When Mallory turns up, they'll click through hers too.

> **Rule:** a certificate warning on one of our systems is a **fault**, not a feature. Fix the certificate. Never tell a user to click through.

The same applies to admins and code:

| "Fix" | What it really does |
|---|---|
| Clicking *Advanced > Proceed* | Accept any server, including Mallory |
| `curl -k`, `wget --no-check-certificate` | Same |
| PHP `verify_peer => false`, Python `verify=False` | Same, in code that runs unattended forever |
| Java "trust all" `TrustManager` | Same |
| SQL `TrustServerCertificate=True` | Encrypted connection to whoever answers |
| Ignoring the RDP "identity of the remote computer cannot be verified" prompt | You might be typing your admin password into Mallory |

That last one matters a lot for us. RDP uses TLS too, and by default each server uses a **self-signed** certificate, so every admin learns to click "Yes" on that prompt. Issuing proper RDP certificates from our internal CA makes the prompt disappear for real servers, so it means something again when it does appear.

### HSTS: taking the button away

Websites can send an **HSTS** header (`Strict-Transport-Security`) that tells browsers "only ever connect to me over valid HTTPS". Once a browser has seen it, it won't even offer the *Proceed* button for that site. It's worth enabling on internal web apps once their certificates are sorted.

## Legitimate middlemen we run ourselves

Some middlemen are deliberate. They work by **terminating TLS** (decrypting it) and starting a new TLS connection onward. That means they hold a private key and certificate the client trusts.

| Middleman | What it does | What to watch for |
|---|---|---|
| **Reverse proxy / load balancer / WAF** (e.g. a CDN like Akamai or Cloudflare, or an on-prem load balancer) | Users connect to it; it connects to your server | The cert users see lives on the proxy, not your server. The proxy-to-server leg needs TLS too. |
| **Firewall TLS inspection** (outbound decryption) | Decrypts users' and servers' outbound HTTPS to scan it, then re-encrypts with a certificate signed by **our internal CA** | Domain-joined Windows trusts it. Java, Python, PHP and appliances with their own trust stores don't, so outbound API calls fail with chain errors. Some sites (banking, health, certificate-pinned apps) are excluded on purpose. |
| **Corporate web proxy** | Forwards outbound traffic | Usually doesn't decrypt unless it's also doing inspection |

Two consequences for app admins:

1. **When an outbound call from a server fails with a chain error, check whether inspection is in the path** before blaming the vendor. The fix is to add our internal root to that app's trust store, or to request an inspection exemption, never to turn verification off.
2. **Anything that can mint trusted certificates is a crown jewel.** The firewall's inspection CA key and our internal CA key can both impersonate any site to our users.

## Summary

- TLS makes middlemen harmless **only if the client checks the certificate**.
- A warning on a real attack looks the same as a warning on a misconfigured server. So **we fix every misconfigured server** and **never teach anyone to click through**.
- Our own middlemen (proxies, load balancers, TLS inspection) are fine, but they move where the certificate and key live, and they can break apps with their own trust stores.
