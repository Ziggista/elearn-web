---
title: "TLS and trust: Sally and Chris"
description: What TLS is, why we need it, and how a client comes to trust a server, told as a story.
---

This page explains what TLS is, why we need it, and how trust works, using a simple story. If you want the bigger picture of keys, certificates and file formats, see the [training notes](/pki-tls/).

**Slides for this topic:** [present the Sally and Chris deck](/present/tls-trust/). Slide numbers are shown under each section.

## Learning objectives

*📽️ Slide [2](/present/tls-trust/#2)*

By the end of this session you should be able to explain, at arm's length, how PKI works:

1. **Why we need TLS:** the three things it gives, and why encryption alone isn't enough.
2. **How trust works:** the client trusts the CA, the CA vouches for the server, and the server proves it holds the private key.
3. **What happens on connect:** the handshake, the four checks, and a shared secret that's never sent.
4. **Where it lives at work:** who plays Sally, Chris and Charlie on IIS, AD CS, Tomcat, SQL Server and RDP.
5. **Why keys matter long-term:** save now, decrypt later, and what Heartbleed taught us.

## Meet the cast

*📽️ Slide [3](/present/tls-trust/#3)*

| Who | Role | In real life |
|---|---|---|
| **Sally** 🖥️ | The **server** | `app.rrc.qld.gov.au` running on IIS |
| **Chris** 🧑‍💻 | The **client** | A browser, an app, or another server calling Sally |
| **Charlie** 🏛️ | The **Certificate Authority (CA)** | DigiCert, Let's Encrypt, or our internal CA |
| **Eve** 👂 | An **eavesdropper** | Anyone who can see the network traffic: shared Wi-Fi, a compromised switch, a tap |
| **Mallory** 😈 | An **active attacker** | Someone who can intercept and change traffic, or pretend to be Sally |

## Why we need TLS: the postcard problem

*📽️ Slides [4](/present/tls-trust/#4), [5](/present/tls-trust/#5)*

Without TLS, every message Chris sends Sally is a **postcard**. Every router, switch, Wi-Fi access point and ISP along the way can read it.

- **Eve can read it.** Chris's password, a payroll record, a SQL query result: all in plain text.
- **Mallory can change it.** She can alter a bank account number on its way through, inject a script into a web page, or change a query result.
- **Mallory can pretend to be Sally.** If Chris connects to "Sally" and Mallory answers first, Chris has no way to tell.

TLS turns the postcard into a **sealed, tamper-evident envelope delivered to a verified address**. It gives three things:

| Guarantee | Stops | Analogy |
|---|---|---|
| **Confidentiality** | Eve reading the traffic | The envelope is opaque |
| **Integrity** | Mallory changing the traffic | The seal shows if it was opened |
| **Authentication** | Mallory pretending to be Sally | The address was checked against ID |

Encryption alone isn't enough. If Chris sets up a perfectly encrypted connection **with Mallory**, the encryption protects nothing. **Authentication is what makes the encryption worth having.** That's what the rest of this page is about.

## The trust problem

*📽️ Slide [6](/present/tls-trust/#6)*

Sally has a key pair: a **public key** she can hand to anyone, and a **private key** that never leaves her server. Anything signed with her private key can be checked with her public key.

So Chris just needs Sally's public key. But here's the catch: when a public key arrives over the network saying "I'm Sally", **how does Chris know it's really Sally's and not Mallory's?** Mallory can generate her own key pair and say "I'm Sally" too.

Chris has never met Sally. He needs someone **he already trusts** to vouch for her.

## Enter Charlie, the Certificate Authority

*📽️ Slide [7](/present/tls-trust/#7)*

Charlie is like a passport office.

1. **Sally applies.** She generates her key pair, keeps the private key, and sends Charlie a request (a CSR) containing her public key and the name she wants: `app.rrc.qld.gov.au`.
2. **Charlie checks.** Charlie makes Sally prove she controls that name, for example by putting a specific value in DNS or on her website. Mallory can't do this for a domain she doesn't control.
3. **Charlie signs.** Charlie issues a **certificate**: "The public key *X* belongs to `app.rrc.qld.gov.au`, valid until *date*." He signs it with **his** private key.

Now Sally has an ID card for her public key, stamped by Charlie.

## Why Chris trusts Charlie

*📽️ Slides [8](/present/tls-trust/#8), [9](/present/tls-trust/#9)*

Chris trusts Charlie because **Charlie's root certificate was already on Chris's computer before Chris ever met Sally.**

Every operating system, browser and runtime ships with a **trust store**: a list of a few hundred root CAs that have passed audits. On our domain-joined PCs, Group Policy also adds **our internal CA**.

So the chain of trust is:

```
Chris already trusts  →  Charlie (root CA, in Chris's trust store)
Charlie vouches for   →  Sally's public key (by signing her certificate)
Sally proves she owns →  that public key (by signing with her private key)
```

Break any link and Chris refuses to continue.

> In practice Charlie's root signs an **intermediate CA**, and the intermediate signs Sally's certificate. Sally must send the intermediate along with her certificate so Chris can follow the chain. It's one extra link; the idea is the same.

## The conversation: how Chris and Sally start talking securely

*📽️ Slide [10](/present/tls-trust/#10)*

This is the TLS handshake, simplified (TLS 1.3).

### 1. Chris says hello

> **Chris → Sally:** "Hi, I'd like to talk to `app.rrc.qld.gov.au`. I speak TLS 1.3 and 1.2, and here are the encryption methods I support. Here's my half of a key exchange."

The name Chris asks for (SNI) lets Sally pick the right certificate if she hosts several sites.

### 2. Sally shows her ID and proves it's hers

*📽️ Slide [11](/present/tls-trust/#11)*

> **Sally → Chris:** "Hi. Let's use TLS 1.3 with these settings. Here's my half of the key exchange. Here's my certificate, and the intermediate that links it to Charlie. And here's a signature over everything we've said so far, made with my private key."

That last signature is crucial. Anyone can **copy** Sally's certificate (it's public). Only Sally can **sign** with the matching private key. If Mallory replays Sally's certificate, she can't produce the signature.

### 3. Chris checks everything

*📽️ Slide [12](/present/tls-trust/#12)*

Chris runs four checks:

| Check | Chris asks | If it fails |
|---|---|---|
| **Name** | Is `app.rrc.qld.gov.au` in the certificate's SAN list? | Stop: maybe this is the wrong server |
| **Dates** | Is today inside the certificate's validity period? | Stop: expired or not yet valid |
| **Chain** | Does the signature chain lead up to a root in my trust store? | Stop: Charlie didn't vouch for this |
| **Revocation** | Has Charlie cancelled this certificate? | Stop: the key may have been stolen |

Then Chris checks Sally's signature using the public key in the certificate. If it's valid, **Chris now knows he's talking to whoever holds Sally's private key**, and Charlie vouched that this is `app.rrc.qld.gov.au`.

### 4. They agree a secret without ever sending it

*📽️ Slide [13](/present/tls-trust/#13)*

In steps 1 and 2, Chris and Sally each sent half of a **key exchange** (Elliptic-Curve Diffie-Hellman, ECDHE). The neat trick is that each side combines its own **secret** number with the other side's **public** half and they both arrive at the **same shared secret**, while Eve, who saw both public halves, can't work it out.

The classic analogy is mixing paint:

1. Chris and Sally agree on a common colour in public (yellow).
2. Each picks a secret colour (Chris: red, Sally: blue) and mixes it with yellow. They swap the mixtures in public.
3. Each adds their own secret colour to the mixture they received. Both end up with yellow + red + blue: the same final colour.
4. Eve saw yellow, yellow+red, and yellow+blue, but un-mixing paint is impractical. She can't get the final colour.

### 5. The secure conversation

Both sides turn the shared secret into **session keys** and switch to fast **symmetric encryption** (AES or ChaCha20). Every message is now encrypted and has an integrity check. Eve sees noise; if Mallory changes a single bit, the check fails and the connection is dropped.

The private key and certificate were only needed for **step 2 and 3**: proving who Sally is. The actual secret was created fresh for this one conversation.

## What if Mallory tries something?

*📽️ Slide [14](/present/tls-trust/#14)*

| Mallory's move | What happens |
|---|---|
| Answers instead of Sally with **her own self-signed cert** | Chain check fails. Chris's browser shows a warning. |
| Answers with **a real cert for a different name** she owns | Name check fails. |
| **Copies** Sally's real certificate and sends it | Chris accepts the cert, but Mallory can't produce the signature from step 2 without Sally's private key. Handshake fails. |
| **Changes** traffic after the handshake | Integrity check fails; connection dropped. |
| **Records** everything for later | She has encrypted noise. Unless... see below. |

This is why **"just click through the warning"**, `curl -k`, `verify=False` and `TrustServerCertificate=True` are so dangerous: they skip exactly the checks that stop Mallory.

## Sally in real life

*📽️ Slide [15](/present/tls-trust/#15)*

The story maps directly onto the systems we run.

| Character | At work | Their "ID" lives in |
|---|---|---|
| **Sally** 🖥️ | An IIS site, SQL Server, a Tomcat app, an RDP host | The Windows certificate store, or a Java keystore |
| **Chris** 🧑‍💻 | A browser, SSMS or an app's SQL driver, a Java app, `mstsc` | His trust store (Windows, or Java's `cacerts`) |
| **Charlie** 🏛️ | Our internal CA (**AD CS**, managed in `certsrv.msc`), or a public CA | Charlie's root, pushed to domain PCs by Group Policy |
| **Charlie's staff** | The PKI admins who approve and issue | |

### Sally is an IIS site

*📽️ Slide [16](/present/tls-trust/#16)*

1. **Make a key and CSR on the IIS server**: `certlm.msc` → *Create Custom Request*, or `certreq -new app.inf app.req`. Key **not exportable**, every name in the SAN.
2. **Send only the `.req`** to the PKI admins. The private key stays with Sally.
3. **Charlie signs**: AD CS issues from a template (e.g. *Web Server*) and returns a `.cer`.
4. **Sally pairs it**: `certreq -accept app.cer` on **the same server**. The key icon means ID and key are matched.
5. **Sally shows her ID**: IIS → *Bindings* → *https* → pick the cert. Test from another machine.

Step-by-step detail is on [Our PKI](/pki-tls/our-pki/).

### Charlie is AD CS

*📽️ Slide [17](/present/tls-trust/#17)*

Inside Charlie's office (`certsrv.msc`) you'd see:

- **Issued, Pending, Failed and Revoked** certificates.
- **Templates**: the rules for each kind of ID, such as its purpose, key size, **whether the key can be exported**, and who may enrol.
- **Revocation**: Charlie publishes a **CRL**, the list of IDs he's cancelled, which Chris checks.
- **Charlie's own key** can sign an ID for **any** name, trusted by every domain PC. That's why only the PKI admins hold the pen.

Some CAs also offer a web enrolment page at `/certsrv`. Requests still go through the PKI admins.

### Sally is a Tomcat app

*📽️ Slide [18](/present/tls-trust/#18)*

Java keeps things in files:

- **Keystore = Sally's wallet**: her private key, certificate and Charlie's cert (`conf/app.p12`, password in `server.xml`). **Secret.**
- **Truststore = Chris's list of Charlies**: used when the Java app is the client (`cacerts`). Group Policy doesn't touch it, so our root has to be **added by hand**, and vendor Java upgrades can wipe it.

The steps are the same as IIS with `keytool` instead of `certreq`: make the key in a new keystore, send the CSR, import Charlie's cert first, then Sally's under the same alias. See [Java keystores and Tomcat](/pki-tls/java-tomcat/).

### Sally is SQL Server or an RDP host

*📽️ Slide [19](/present/tls-trust/#19)*

- **SQL Server**: Sally's ID is picked in SQL Server Configuration Manager, and the SQL service account needs Read on her key. `TrustServerCertificate=True` is Chris saying "I won't look at your ID".
- **RDP**: by default Sally shows a **self-signed** ID. The "identity of the remote computer cannot be verified" prompt is Chris being asked to trust a stranger. A cert from Charlie makes it go away.

**If Chris skips the ID check, Mallory can be Sally.**

### Where Sally keeps her private key

*📽️ Slide [20](/present/tls-trust/#20)*

| Sally is… | Private key lives in | Rule |
|---|---|---|
| IIS / RDP / LDAPS | Windows machine key store | Non-exportable |
| SQL Server | Windows machine key store | Service account Read only |
| Tomcat | Keystore file + password | Lock down the file and `server.xml` |
| Charlie (AD CS) | The CA server | PKI admins only |

New server? **Sally applies again.** Never copy her key (`.pfx`) somewhere new. More on [Private keys](/pki-tls/private-keys/).

## Save now, decrypt later

*📽️ Slide [21](/present/tls-trust/#21)*

Encryption protects data **today**. But an attacker doesn't have to break it today. They can **record encrypted traffic now** and **decrypt it later**, when they get something they didn't have before. This is called *harvest now, decrypt later* or *save now, decrypt later*.

There are two ways "later" arrives.

### 1. The server's private key gets stolen: Heartbleed

*📽️ Slide [22](/present/tls-trust/#22)*

**Heartbleed** (CVE-2014-0160, April 2014) was a bug in **OpenSSL**, the TLS library used by Apache, nginx, countless appliances and embedded devices. A malformed "heartbeat" message made the server send back up to **64 KB of its own memory** per request, with no log entry. Attackers could repeat it as often as they liked.

That memory could contain passwords, session cookies and, as researchers proved within days, **the server's private TLS key**.

Here's why that mattered for *past* traffic. In older TLS setups using **RSA key exchange**, Chris encrypted the session secret with Sally's public key. So anyone who had **recorded** Chris's traffic, and later got **Sally's private key**, could decrypt every recorded session, going back years.

| Key exchange | Session secret made by | If Sally's private key is stolen later |
|---|---|---|
| **RSA key exchange** (TLS 1.2 `TLS_RSA_…` suites) | Chris encrypts it with Sally's public key | **Every recorded past session can be decrypted** |
| **ECDHE** (TLS 1.3, and TLS 1.2 `ECDHE_…` suites) | Fresh per session, never sent, thrown away | Past sessions stay safe: this is **forward secrecy** |

Heartbleed is why **forward secrecy** went from "nice to have" to mandatory. TLS 1.3 removed RSA key exchange entirely.

Heartbleed's other lessons:

- **Patching wasn't enough.** If a key might have leaked, you had to **generate a new key, reissue the certificate and revoke the old one**. Many sites patched and kept the same, possibly stolen, key.
- **It was in places nobody was watching.** Load balancers, VPN appliances, printers, NAS boxes and vendor software bundled their own OpenSSL. Windows (which uses its own TLS library, SChannel) wasn't affected, but Apache, PHP and appliances on the same network were.

### 2. The maths gets broken: quantum computers

*📽️ Slide [23](/present/tls-trust/#23)*

The public-key algorithms behind today's key exchange and certificates (RSA, ECDH, ECDSA) are expected to be breakable by a large enough **quantum computer**. Nobody has one yet, but an adversary recording traffic today can wait.

That makes it the same problem as Heartbleed, on a bigger scale: **anything recorded now with only today's key exchange could be readable later**, even with forward secrecy, because the key exchange itself is what gets broken.

The response is **post-quantum cryptography**:

- **ML-KEM** (NIST FIPS 203, 2024) is a quantum-resistant key exchange.
- Browsers and big providers already use a **hybrid** key exchange (`X25519MLKEM768`) that combines classic ECDH with ML-KEM, so it's safe if either one holds.
- ASD's guidance for Australian government is to plan to **stop relying on traditional asymmetric cryptography by 2030**.

### Why this matters to us

*📽️ Slide [24](/present/tls-trust/#24)*

Council data often stays sensitive for a long time: HR and payroll, ratepayer records, legal matters, CCTV, SCADA traffic. If someone could record it today and read it in 5 or 10 years, that's still a breach.

What we can do now:

1. **Use TLS 1.3 wherever possible**, and on TLS 1.2 allow **only ECDHE** cipher suites. Turn off `TLS_RSA_…` key exchange suites.
2. **Patch TLS libraries**, including the ones bundled inside appliances and vendor apps (OpenSSL, Java, .NET).
3. **If a private key might have leaked, replace it.** New key, new certificate, revoke the old one. Never just patch and move on.
4. **Keep an inventory** of where certificates and keys live, so the next Heartbleed is a list, not a hunt.
5. **Start asking vendors about post-quantum support** (hybrid ML-KEM) in their TLS stacks and roadmaps.

## Summary

*📽️ Slide [25](/present/tls-trust/#25)*

- TLS gives **confidentiality, integrity and authentication**. Without authentication, encryption is worthless.
- Chris trusts Sally because **Chris already trusts Charlie**, Charlie **vouched for Sally's public key**, and Sally **proved she holds the private key**.
- The session secret is **created fresh and never sent**, so even Sally's private key can't unlock past sessions (forward secrecy).
- **Save now, decrypt later** is real: Heartbleed showed what happens when keys leak, and quantum computing is the next version of the same threat.
