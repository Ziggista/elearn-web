---
title: "A brief history: SSL to TLS 1.3"
description: How SSL became TLS, the incidents that shaped it, and where certificates are heading next.
---

**Slides for this page** are in the [Certificates for Corp Apps](/present/corp-apps-pki/) deck. Slide numbers are shown under each section.

Why bother with history? Because nearly every rule we follow today ("turn off TLS 1.0", "no RSA key exchange", "replace the key, don't just patch") exists because of a specific incident. Knowing the story makes the rules make sense.

## The versions

*📽️ Slide [19](/present/corp-apps-pki/#19)*

| Year | Version | What happened |
|---|---|---|
| 1995 | **SSL 2.0** | Netscape's first public version (1.0 never shipped). Serious design flaws. |
| 1996 | **SSL 3.0** | A redesign. The basis for everything since. |
| 1999 | **TLS 1.0** | SSL renamed when it moved to the IETF standards body. Essentially SSL 3.1. |
| 2006 | **TLS 1.1** | Small fixes for attacks on CBC encryption. |
| 2008 | **TLS 1.2** | Modern ciphers (AES-GCM, SHA-256). Still the compatibility baseline. |
| 2018 | **TLS 1.3** | A clean-up: removed every weak option, made forward secrecy mandatory, faster handshake. |

Formally retired: SSL 2.0 (2011), SSL 3.0 (2015), TLS 1.0 and 1.1 (2021, RFC 8996).

**"SSL certificate"** is just the name that stuck. The certificates are the same no matter which protocol version uses them.

## Protocol attacks that changed the rules

| Year | Attack | What it broke | The rule it gave us |
|---|---|---|---|
| 2011 | **BEAST** | CBC encryption in TLS 1.0 | Move to TLS 1.2 |
| 2012 | **CRIME** | TLS compression leaked secrets like cookies | Compression off |
| 2014 | **Heartbleed** | OpenSSL bug leaked server memory, including **private keys** | Patch fast, **replace keys** after a leak, use **forward secrecy** |
| 2014 | **POODLE** | SSL 3.0 itself | SSL 3.0 off everywhere |
| 2015 | **FREAK / Logjam** | Servers could be tricked into weak 1990s "export" crypto | Remove export ciphers and weak Diffie-Hellman |
| 2016 | **DROWN** | Any server still allowing SSL 2.0 put its key at risk, even for TLS on other servers sharing the key | SSL 2.0 off, and don't share keys across servers |

A pattern worth noticing: **old options left switched on "for compatibility" were the attack path** almost every time. That's why we turn old versions and ciphers off rather than leaving them available.

## Heartbleed, in a bit more detail

*📽️ Slide [20](/present/corp-apps-pki/#20)*

In April 2014 a bug in **OpenSSL** (CVE-2014-0160) was disclosed. A malformed "heartbeat" message made a server reply with up to **64 KB of its own memory**, as often as the attacker liked, with nothing in the logs.

- That memory contained passwords, session cookies and, as researchers proved within days, **the server's private TLS key**.
- Patching stopped new leaks, but if the key had already leaked the attacker still had it. The fix was **patch, generate a new key, reissue the certificate, and revoke the old one**. Many organisations patched and stopped there.
- Anyone who had **recorded** traffic to a server using old RSA key exchange could decrypt it once they had the key. That's the [save now, decrypt later](/pki-tls/tls-trust/#save-now-decrypt-later) problem, and it's why forward secrecy is now mandatory.
- OpenSSL was hiding in **appliances, load balancers, VPNs, printers and vendor software**. Windows (SChannel) wasn't affected, but plenty of things on Windows networks were. Knowing where your TLS software lives is half the battle.

## Certificate Authority incidents

The protocol can be perfect and still fail if a CA misbehaves, because everyone trusts what the CA signs.

| Year | Incident | Lesson |
|---|---|---|
| 2011 | **DigiNotar** (Netherlands) was hacked and fake certificates for `*.google.com` were used to spy on users in Iran. Browsers removed DigiNotar entirely; the company went bankrupt. | A CA is only as trusted as its security. A compromised CA can impersonate **anyone**. |
| 2017–18 | **Symantec** (then one of the biggest CAs) was distrusted by browsers after repeated mis-issuance. A large share of the web had to replace certificates. | Even huge CAs can be removed. Be able to replace certs quickly. |
| 2024 | **Entrust** was distrusted by Chrome and others for new certificates after a history of compliance failures. | Same lesson again. |

The lesson for us: **our internal CA is the DigiNotar of our network.** If it's compromised, an attacker can issue a valid certificate for any internal name and every domain-joined machine will trust it. That's why the CA's own key is the most sensitive key we have.

## Where it's heading

*📽️ Slide [21](/present/corp-apps-pki/#21)*

### Shorter certificates

Public certificate lifetimes have been shrinking for years:

| Year | Maximum public cert lifetime |
|---|---|
| Before 2015 | 5 years |
| 2018 | 825 days |
| 2020 | 398 days |
| 15 March 2026 | **200 days** |
| 15 March 2027 | **100 days** |
| 15 March 2029 | **47 days** |

Short lifetimes limit the damage from a stolen key or a mis-issued cert, and they force automation. Renewing 100 certificates by hand every 47 days isn't a plan.

### Let's Encrypt and ACME

**Let's Encrypt** launched in 2015 as a free, automated public CA. It issues 90-day certificates using the **ACME** protocol: a client on (or near) the server proves control of the domain and fetches a certificate automatically. It made HTTPS the default on the web, and ACME is now supported by most commercial CAs too. Let's Encrypt has announced plans to shorten its own certificates further.

For us: public certs should be moving to ACME-style automation. Internal certs from our own CA aren't bound by the public lifetime rules, but the same principle applies: **if renewal is manual, it will eventually be forgotten.**

### Post-quantum cryptography

A large enough quantum computer is expected to break today's public-key algorithms (RSA, ECDH, ECDSA). It doesn't exist yet, but traffic recorded today could be decrypted when it does.

- **ML-KEM** (NIST FIPS 203, 2024) is a quantum-resistant key exchange. Browsers and large providers already use a **hybrid** of classic and ML-KEM key exchange.
- Quantum-resistant **signatures** for certificates (ML-DSA) are standardised but not yet in everyday public certificates.
- ASD's guidance for Australian government is to plan to **stop relying on traditional asymmetric cryptography by 2030**.

What this means for app owners now: keep TLS libraries current, prefer TLS 1.3, and ask vendors about their post-quantum plans.
