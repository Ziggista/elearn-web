---
title: Quiz
description: Ten questions on PKI and TLS, with answers.
---


Ten questions to run at the end of the session or send afterwards. Answers are at the bottom.

1. You receive a file called `webapp.pfx`. Is it safe to attach to a ticket? Why or why not?
2. Which key does a CA use to sign a certificate: its public key or its private key?
3. A certificate's CN is `app.rrc.qld.gov.au`, but its SAN list only contains `www.rrc.qld.gov.au`. Will a browser accept it for `app.rrc.qld.gov.au`?
4. Name the four things every client checks about a server certificate.
5. A site works fine in Chrome, but a PHP app calling the same URL gets `unable to get local issuer certificate`. What's the most likely cause?
6. Can a public CA such as DigiCert issue a certificate for `sql01.rrc.local`?
7. After a driver upgrade, an app can't connect to SQL Server: "The certificate chain was issued by an authority that is not trusted." A colleague suggests adding `TrustServerCertificate=True`. What's wrong with that, and what's the proper fix?
8. During a TLS session, is the bulk of the data encrypted with public-key crypto or symmetric crypto?
9. Which TLS versions should be enabled on a new server?
10. From March 2027, what's the maximum validity of a public TLS certificate, and why does that matter to us?

---

## Answers

1. **No.** A .pfx contains the private key. Treat it like a password: never attach it to a ticket, email it or put it on a share.
2. **Its private key.** Anyone can then check the signature with the CA's public key.
3. **No.** Browsers ignore the CN and only check the SAN list.
4. **Name** (in the SAN), **dates** (not expired), **chain** (leads to a trusted root), **revocation** (not cancelled).
5. The server **isn't sending the intermediate certificate** (Chrome fetches it quietly, PHP doesn't), or PHP's CA bundle doesn't trust the issuing CA.
6. **No.** Public CAs only issue for public domains we can prove we own. `.local` names need the internal CA.
7. It keeps encryption but **turns off authentication**, so anyone in the middle could impersonate the SQL server. The fix is to install a certificate on SQL Server from a CA the client trusts (our internal CA) with the right name in its SAN.
8. **Symmetric.** Public-key crypto is only used during the handshake to prove identity and agree a session key.
9. **TLS 1.2 and TLS 1.3.** SSL 3.0, TLS 1.0 and TLS 1.1 should be off.
10. **100 days** (dropping to 47 days in March 2029). Manual renewal stops being practical, so we need automation and an accurate certificate inventory.
