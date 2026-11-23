---
title: "TLS and trust: Seb and Clint"
description: What TLS is, why we need it, and how a client comes to trust a server, told as a story.
---

This page explains what TLS is, why we need it, and how trust works, using a simple story. If you want the bigger picture of keys, certificates and file formats, see the [training notes](/pki-tls/).

**Slides for this topic:** [present the Seb and Clint deck](/present/tls-trust/). Slide numbers are shown under each section.

**Handout:** [download the handout (PDF)](/downloads/seb-clint-padlock-handout.pdf). It has every slide with its talking points and space for notes.

## Learning objectives

*📽️ Slide [2](/present/tls-trust/#2)*


By the end of this session you should be able to explain, at arm's length, how PKI works:

1. **Why we need TLS:** the three things it gives, and why encryption alone isn't enough.
2. **How trust works:** the client trusts the CA, the CA vouches for the server, and the server proves it holds the private key.
3. **What happens on connect:** the handshake, the four checks, and a shared secret that's never sent.
4. **What goes in a certificate:** CN vs SAN, what an internal server cert needs, and server vs client use.
5. **Where it lives at work:** who plays Seb, Clint and Cash on IIS, AD CS, Tomcat, SQL Server and RDP, and where the keys live.
6. **Why keys matter long-term:** save now, decrypt later, and what Heartbleed taught us.

## Meet the cast

*📽️ Slide [5](/present/tls-trust/#5)*


| Who | Role | In real life |
|---|---|---|
| **Seb** 🖥️ | The **server** | `app.council.qld.gov.au` running on IIS |
| **Clint** 🧑‍💻 | The **client** | A browser, an app, or another server calling Seb |
| **Cash** 🏛️ | The **Certificate Authority (CA)** | DigiCert, Let's Encrypt, or our internal CA |
| **Eve** 👂 | An **eavesdropper** | Anyone who can see the network traffic: shared Wi-Fi, a compromised switch, a tap |
| **Hank** 😈 | An **active attacker** | Someone who can intercept and change traffic, or pretend to be Seb |

## Why we need TLS: the postcard problem

*📽️ Slides [3](/present/tls-trust/#3), [4](/present/tls-trust/#4), [6](/present/tls-trust/#6), [7](/present/tls-trust/#7)*


Without TLS, every message Clint sends Seb is a **postcard**. Every router, switch, Wi-Fi access point and ISP along the way can read it.

- **Eve can read it.** Clint's password, a payroll record, a SQL query result: all in plain text.
- **Hank can change it.** Hank can alter a bank account number on its way through, inject a script into a web page, or change a query result.
- **Hank can pretend to be Seb.** If Clint connects to "Seb" and Hank answers first, Clint has no way to tell.

TLS turns the postcard into a **sealed, tamper-evident envelope delivered to a verified address**. It gives three things:

| Guarantee | Stops | Analogy |
|---|---|---|
| **Confidentiality** | Eve reading the traffic | The envelope is opaque |
| **Integrity** | Hank changing the traffic | The seal shows if it was opened |
| **Authentication** | Hank pretending to be Seb | The address was checked against ID |

Encryption alone isn't enough. If Clint sets up a perfectly encrypted connection **with Hank**, the encryption protects nothing. **Authentication is what makes the encryption worth having.** That's what the rest of this page is about.

## The trust problem

*📽️ Slide [8](/present/tls-trust/#8)*


Seb has a key pair: a **public key** to hand to anyone, and a **private key** that never leaves Seb's server. Anything signed with Seb's private key can be checked with Seb's public key.

So Clint just needs Seb's public key. But here's the catch: when a public key arrives over the network saying "I'm Seb", **how does Clint know it's really Seb's and not Hank's?** Hank can generate a key pair too and say "I'm Seb".

Clint has never met Seb. Clint needs someone **already trusted** to vouch for Seb.

## Enter Cash, the Certificate Authority

*📽️ Slide [9](/present/tls-trust/#9)*


Cash is like a passport office.

1. **Seb applies.** Seb generates a key pair, keeps the private key, and sends Cash a request (a CSR) containing the public key and the name Seb wants: `app.council.qld.gov.au`.
2. **Cash checks.** Cash makes Seb prove control of that name, for example by putting a specific value in DNS or on the website. Hank can't do this for a domain Hank doesn't control.
3. **Cash signs.** Cash issues a **certificate**: "The public key *X* belongs to `app.council.qld.gov.au`, valid until *date*." Cash signs it with **Cash's own** private key.

Now Seb has an ID card for that public key, stamped by Cash.

## Why Clint trusts Cash

*📽️ Slides [10](/present/tls-trust/#10), [11](/present/tls-trust/#11)*


Clint trusts Cash because **Cash's root certificate was already on Clint's computer before Clint ever met Seb.**

Every operating system, browser and runtime ships with a **trust store**: a list of a few hundred root CAs that have passed audits. On our domain-joined PCs, Group Policy also adds **our internal CA**.

So the chain of trust is:

```
Clint already trusts  →  Cash (root CA, in Clint's trust store)
Cash vouches for   →  Seb's public key (by signing Seb's certificate)
Seb proves ownership → of that public key (by signing with the private key)
```

Break any link and Clint refuses to continue.

> In practice Cash's root signs an **intermediate CA**, and the intermediate signs Seb's certificate. Seb must send the intermediate along with the certificate so Clint can follow the chain. It's one extra link; the idea is the same.

## The conversation: how Clint and Seb start talking securely

*📽️ Slide [12](/present/tls-trust/#12)*


This is the TLS handshake, simplified (TLS 1.3).

### 1. Clint says hello

> **Clint → Seb:** "Hi, I'd like to talk to `app.council.qld.gov.au`. I speak TLS 1.3 and 1.2, and here are the encryption methods I support. Here's my half of a key exchange."

The name Clint asks for (SNI) lets Seb pick the right certificate if Seb hosts several sites.

### 2. Seb shows ID and proves it's genuine

*📽️ Slide [13](/present/tls-trust/#13)*


> **Seb → Clint:** "Hi. Let's use TLS 1.3 with these settings. Here's my half of the key exchange. Here's my certificate, and the intermediate that links it to Cash. And here's a signature over everything we've said so far, made with my private key."

That last signature is crucial. Anyone can **copy** Seb's certificate (it's public). Only Seb can **sign** with the matching private key. If Hank replays Seb's certificate, Hank can't produce the signature.

### 3. Clint checks everything

*📽️ Slide [14](/present/tls-trust/#14)*


Clint runs four checks:

| Check | Clint asks | If it fails |
|---|---|---|
| **Name** | Is `app.council.qld.gov.au` in the certificate's SAN list? | Stop: maybe this is the wrong server |
| **Dates** | Is today inside the certificate's validity period? | Stop: expired or not yet valid |
| **Chain** | Does the signature chain lead up to a root in my trust store? | Stop: Cash didn't vouch for this |
| **Revocation** | Has Cash cancelled this certificate? | Stop: the key may have been stolen |

Then Clint checks Seb's signature using the public key in the certificate. If it's valid, **Clint now knows it's talking to whoever holds Seb's private key**, and Cash vouched that this is `app.council.qld.gov.au`.

### 4. They agree a secret without ever sending it

*📽️ Slide [15](/present/tls-trust/#15)*


In steps 1 and 2, Clint and Seb each sent half of a **key exchange** (Elliptic-Curve Diffie-Hellman, ECDHE). The neat trick is that each side combines its own **secret** number with the other side's **public** half and they both arrive at the **same shared secret**, while Eve, who saw both public halves, can't work it out.

The classic analogy is mixing paint:

1. Clint and Seb agree on a common colour in public (yellow).
2. Each picks a secret colour (Clint: red, Seb: blue) and mixes it with yellow. They swap the mixtures in public.
3. Each adds their own secret colour to the mixture they received. Both end up with yellow + red + blue: the same final colour.
4. Eve saw yellow, yellow+red, and yellow+blue, but un-mixing paint is impractical, so Eve can't get the final colour.

### 5. The secure conversation

Both sides turn the shared secret into **session keys** and switch to fast **symmetric encryption** (AES or ChaCha20). Every message is now encrypted and has an integrity check. Eve sees noise; if Hank changes a single bit, the check fails and the connection is dropped.

The private key and certificate were only needed for **step 2 and 3**: proving who Seb is. The actual secret was created fresh for this one conversation.

## What if Hank tries something?

*📽️ Slides [16](/present/tls-trust/#16), [17](/present/tls-trust/#17)*


| Hank's move | What happens |
|---|---|
| Answers instead of Seb with **a self-signed cert** | Chain check fails. Clint's browser shows a warning. |
| Answers with **a real cert for a different name** Hank owns | Name check fails. |
| **Copies** Seb's real certificate and sends it | Clint accepts the cert, but Hank can't produce the signature from step 2 without Seb's private key. Handshake fails. |
| **Changes** traffic after the handshake | Integrity check fails; connection dropped. |
| **Records** everything for later | Hank has encrypted noise. Unless... see below. |

This is why **"just click through the warning"**, `curl -k`, `verify=False` and `TrustServerCertificate=True` are so dangerous: they skip exactly the checks that stop Hank.

## What goes in Seb's ID

### CN vs SAN

*📽️ Slides [18](/present/tls-trust/#18), [19](/present/tls-trust/#19)*

A certificate has two places that look like "the name":

| Field | Example | Does Clint check it? |
|---|---|---|
| **Subject CN** (Common Name) | `CN=app.corp.local` | **No.** It's the legacy field; browsers and modern clients stopped matching on it years ago. |
| **Subject Alternative Name (SAN)** | `DNS:app.corp.local`, `DNS:app01.corp.local`, `DNS:reports.corp.local` | **Yes.** This is the list the name check uses. |

- If the name Clint connected to isn't in the SAN, the name check fails, **even if the CN is right**.
- Put **every name** people and systems use in the SAN: the FQDN, any alias or CNAME, the load-balancer name.
- Still set the CN to the main name, for humans and older tools.
- Avoid short names (`app01`) and IP addresses unless something genuinely connects that way.
- Wildcards (`*.corp.local`) only cover one level, and every server using one shares the same key. Prefer per-service SANs.

### What an internal server certificate needs

*📽️ Slide [20](/present/tls-trust/#20)*

Use this as the checklist when you request a cert from the PKI admins, or check one someone else installed:

| Item | What "right" looks like |
|---|---|
| **Names** | Every DNS name in the SAN; CN = the main one |
| **Purpose** | Extended Key Usage (EKU) includes **Server Authentication** |
| **Key** | RSA 2048+ (or ECDSA P-256), generated **on the server**, **non-exportable** |
| **Issuer** | Our internal CA, via the right template (e.g. *Web Server*) |
| **Trust** | Clients trust our root: Group Policy for domain Windows; **added by hand** for Java, Linux, appliances |
| **Revocation** | Clients can reach the CRL and AIA URLs listed in the cert |
| **Lifecycle** | Expiry recorded in the CMDB, owner named, renewal reminder set |

### Server or client: what the ID is for

*📽️ Slide [21](/present/tls-trust/#21)*

A certificate's **Extended Key Usage (EKU)** says what it may be used for, and clients check it.

| EKU | OID | Means | Used by |
|---|---|---|---|
| **Server Authentication** | `1.3.6.1.5.5.7.3.1` | "I am Seb" | IIS, SQL Server, RDP, LDAPS, Tomcat |
| **Client Authentication** | `1.3.6.1.5.5.7.3.2` | "I am Clint" | Wi-Fi/VPN machine certs, API clients using mutual TLS |

- **Mutual TLS (mTLS):** Seb shows ID to Clint *and* asks Clint for ID. Both sides need a cert with the right EKU.
- A server needs **Server Authentication**. A client-only cert bound in IIS will be rejected by browsers.
- The AD CS *Computer* template includes both, which is why a machine cert sometimes "works" on a server. For services, use the proper *Web Server* template with the right SAN names.

## Seb in real life

*📽️ Slides [22](/present/tls-trust/#22), [23](/present/tls-trust/#23)*


The story maps directly onto the systems we run.

| Character | At work | Their "ID" lives in |
|---|---|---|
| **Seb** 🖥️ | An IIS site, SQL Server, a Tomcat app, an RDP host | The Windows certificate store, or a Java keystore |
| **Clint** 🧑‍💻 | A browser, SSMS or an app's SQL driver, a Java app, `mstsc` | Clint's trust store (Windows, or Java's `cacerts`) |
| **Cash** 🏛️ | Our internal CA (**AD CS**, managed in `certsrv.msc`), or a public CA | Cash's root, pushed to domain PCs by Group Policy |
| **Cash's staff** | The PKI admins who approve and issue | |

### Seb is an IIS site

*📽️ Slides [24](/present/tls-trust/#24), [25](/present/tls-trust/#25)*


1. **Make a key and CSR on the IIS server**: `certlm.msc` → *Create Custom Request*, or `certreq -new app.inf app.req`. Key **not exportable**, every name in the SAN.
2. **Send only the `.req`** to the PKI admins. The private key stays with Seb.
3. **Cash signs**: AD CS issues from a template (e.g. *Web Server*) and returns a `.cer`.
4. **Seb pairs it**: `certreq -accept app.cer` on **the same server**. The key icon means ID and key are matched.
5. **Seb shows the ID**: IIS → *Bindings* → *https* → pick the cert. Test from another machine.

Step-by-step detail is on [Our PKI](/pki-tls/our-pki/).

### Cash is AD CS

*📽️ Slide [26](/present/tls-trust/#26)*


Inside Cash's office (`certsrv.msc`) you'd see:

- **Issued, Pending, Failed and Revoked** certificates.
- **Templates**: the rules for each kind of ID, such as its purpose, key size, **whether the key can be exported**, and who may enrol.
- **Revocation**: Cash publishes a **CRL**, the list of cancelled IDs, which Clint checks.
- **Cash's own key** can sign an ID for **any** name, trusted by every domain PC. That's why only the PKI admins hold the pen.

Some CAs also offer a web enrolment page at `/certsrv`. Requests still go through the PKI admins.

### Seb is a Tomcat app

*📽️ Slides [29](/present/tls-trust/#29), [30](/present/tls-trust/#30), [31](/present/tls-trust/#31)*


Java keeps things in files:

- **Keystore = Seb's wallet**: Seb's private key, certificate and Cash's cert (`conf/app.p12`, password in `server.xml`). **Secret.**
- **Truststore = Clint's list of Cashs**: used when the Java app is the client (`cacerts`). Group Policy doesn't touch it, so our root has to be **added by hand**, and vendor Java upgrades can wipe it.

The steps are the same as IIS with `keytool` instead of `certreq`: make the key in a new keystore, send the CSR, import Cash's cert first, then Seb's under the same alias. See [Java keystores and Tomcat](/pki-tls/java-tomcat/).

### Seb is SQL Server or an RDP host

*📽️ Slides [27](/present/tls-trust/#27), [28](/present/tls-trust/#28)*


- **SQL Server**: Seb's ID is picked in SQL Server Configuration Manager, and the SQL service account needs Read on Seb's key. `TrustServerCertificate=True` is Clint saying "I won't look at your ID".
- **RDP**: by default Seb shows a **self-signed** ID. The "identity of the remote computer cannot be verified" prompt is Clint being asked to trust a stranger. A cert from Cash makes it go away.

**If Clint skips the ID check, Hank can be Seb.**

### Where Seb keeps the private key

*📽️ Slides [32](/present/tls-trust/#32), [33](/present/tls-trust/#33), [34](/present/tls-trust/#34), [35](/present/tls-trust/#35)*


| Seb is… | Private key lives in | Rule |
|---|---|---|
| IIS / RDP / LDAPS | Windows machine key store | Non-exportable |
| SQL Server | Windows machine key store | Service account Read only |
| Tomcat | Keystore file + password | Lock down the file and `server.xml` |
| Cash (AD CS) | The CA server | PKI admins only |

New server? **Seb applies again.** Never copy Seb's key (`.pfx`) somewhere new. More on [Private keys](/pki-tls/private-keys/).

## Save now, decrypt later

*📽️ Slide [37](/present/tls-trust/#37)*


Encryption protects data **today**. But an attacker doesn't have to break it today. They can **record encrypted traffic now** and **decrypt it later**, when they get something they didn't have before. This is called *harvest now, decrypt later* or *save now, decrypt later*.

There are two ways "later" arrives.

### 1. The server's private key gets stolen: Heartbleed

*📽️ Slide [38](/present/tls-trust/#38)*


**Heartbleed** (CVE-2014-0160, April 2014) was a bug in **OpenSSL**, the TLS library used by Apache, nginx, countless appliances and embedded devices. A malformed "heartbeat" message made the server send back up to **64 KB of its own memory** per request, with no log entry. Attackers could repeat it as often as they liked.

That memory could contain passwords, session cookies and, as researchers proved within days, **the server's private TLS key**.

Here's why that mattered for *past* traffic. In older TLS setups using **RSA key exchange**, Clint encrypted the session secret with Seb's public key. So anyone who had **recorded** Clint's traffic, and later got **Seb's private key**, could decrypt every recorded session, going back years.

| Key exchange | Session secret made by | If Seb's private key is stolen later |
|---|---|---|
| **RSA key exchange** (TLS 1.2 `TLS_RSA_…` suites) | Clint encrypts it with Seb's public key | **Every recorded past session can be decrypted** |
| **ECDHE** (TLS 1.3, and TLS 1.2 `ECDHE_…` suites) | Fresh per session, never sent, thrown away | Past sessions stay safe: this is **forward secrecy** |

Heartbleed is why **forward secrecy** went from "nice to have" to mandatory. TLS 1.3 removed RSA key exchange entirely.

Heartbleed's other lessons:

- **Patching wasn't enough.** If a key might have leaked, you had to **generate a new key, reissue the certificate and revoke the old one**. Many sites patched and kept the same, possibly stolen, key.
- **It was in places nobody was watching.** Load balancers, VPN appliances, printers, NAS boxes and vendor software bundled their own OpenSSL. Windows (which uses its own TLS library, SChannel) wasn't affected, but Apache, PHP and appliances on the same network were.

### 2. The maths gets broken: quantum computers

*📽️ Slide [39](/present/tls-trust/#39)*


The public-key algorithms behind today's key exchange and certificates (RSA, ECDH, ECDSA) are expected to be breakable by a large enough **quantum computer**. Nobody has one yet, but an adversary recording traffic today can wait.

That makes it the same problem as Heartbleed, on a bigger scale: **anything recorded now with only today's key exchange could be readable later**, even with forward secrecy, because the key exchange itself is what gets broken.

The response is **post-quantum cryptography**:

- **ML-KEM** (NIST FIPS 203, 2024) is a quantum-resistant key exchange.
- Browsers and big providers already use a **hybrid** key exchange (`X25519MLKEM768`) that combines classic ECDH with ML-KEM, so it's safe if either one holds.
- ASD's guidance for Australian government is to plan to **stop relying on traditional asymmetric cryptography by 2030**.

### Why this matters to us

*📽️ Slide [40](/present/tls-trust/#40)*


Council data often stays sensitive for a long time: HR and payroll, ratepayer records, legal matters, CCTV, SCADA traffic. If someone could record it today and read it in 5 or 10 years, that's still a breach.

What we can do now:

1. **Use TLS 1.3 wherever possible**, and on TLS 1.2 allow **only ECDHE** cipher suites. Turn off `TLS_RSA_…` key exchange suites.
2. **Patch TLS libraries**, including the ones bundled inside appliances and vendor apps (OpenSSL, Java, .NET).
3. **If a private key might have leaked, replace it.** New key, new certificate, revoke the old one. Never just patch and move on.
4. **Keep an inventory** of where certificates and keys live, so the next Heartbleed is a list, not a hunt.
5. **Start asking vendors about post-quantum support** (hybrid ML-KEM) in their TLS stacks and roadmaps.

## Summary

*📽️ Slide [41](/present/tls-trust/#41)*


- TLS gives **confidentiality, integrity and authentication**. Without authentication, encryption is worthless.
- Clint trusts Seb because **Clint already trusts Cash**, Cash **vouched for Seb's public key**, and Seb **proved it holds the private key**.
- The session secret is **created fresh and never sent**, so even Seb's private key can't unlock past sessions (forward secrecy).
- **Save now, decrypt later** is real: Heartbleed showed what happens when keys leak, and quantum computing is the next version of the same threat.
