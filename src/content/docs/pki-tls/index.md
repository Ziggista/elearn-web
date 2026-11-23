---
title: Locks, Keys and Certificates
description: PKI, TLS and public-key crypto for the people who run our servers.
---

**Slides:** the session deck is [Seb, Clint and the padlock](/present/tls-trust/). Where a section is covered, the slide number is shown under it.


**PKI, TLS and public-key crypto for the people who run our servers**

Corp Apps training · about 45 minutes · no prior knowledge needed

---

## Why this matters to you

*📽️ Slides [3](/present/tls-trust/#3), [4](/present/tls-trust/#4)*


You run web servers, app servers and SQL boxes. Sooner or later one of these happens:

- A site starts throwing a big red browser warning on a Monday morning because a certificate expired over the weekend.
- An app suddenly can't talk to SQL Server after a driver update, with an error about an "untrusted authority".
- A Java, PHP or Python app works on your machine but fails on the server with "unable to get local issuer certificate".
- A vendor asks you to "install this .pfx" and you're not sure what's in it or how careful to be.

Every one of these is a TLS or certificate problem. Once you understand the handful of ideas below, they stop being mysterious and become routine fixes.

**What you'll know by the end:**

1. What public and private keys are, and the two jobs they do.
2. What a certificate is, and why we trust one.
3. What TLS actually does when a client connects.
4. Where TLS shows up on our servers, what the common errors mean, and the habits that keep us out of trouble.

---

## Part 1: The crypto building blocks

### 1.1 Symmetric encryption: one shared key


The oldest kind of encryption uses **one key** to both lock and unlock. Think of a safe with a combination: anyone who knows the combination can open it and close it.

- It's **fast**. Almost all real data (web pages, SQL queries, file transfers) is encrypted this way. AES is the common algorithm.
- The problem: **how do two parties agree on the key** without anyone else hearing it? If I email you the combination, anyone reading the email has it too.

That key-sharing problem is what public-key crypto solves.

### 1.2 Public and private keys: a key pair


Public-key (asymmetric) crypto uses **two keys that are mathematically linked**:

| | Public key | Private key |
|---|---|---|
| Who has it | Anyone. You hand it out freely. | Only the owner. Never leaves the server. |
| Analogy | An open padlock you give to everyone | The only key that opens that padlock |
| If it leaks | Nothing bad; it was public anyway | Serious. Anyone can now pretend to be you. |

Anyone can snap your padlock shut on a box. Only you, with the private key, can open it.

The algorithms you'll see named are **RSA** (older, keys of 2048 or 3072 bits) and **ECDSA / ECC** (newer, smaller keys, e.g. P-256). Both are fine; you don't need to understand the maths.

**The private key is the crown jewel.** Everything in the rest of this session depends on the private key staying private.

### 1.3 The two jobs a key pair does


| Job | Who uses which key | What it proves |
|---|---|---|
| **Encrypt** | Anyone encrypts with your *public* key. Only your *private* key decrypts. | Only you can read it. |
| **Sign** | You sign with your *private* key. Anyone checks with your *public* key. | It really came from you, and nobody changed it. |

Signing is the job that matters most for certificates. A signature is like a wax seal: anyone can look at it and confirm it's genuine, but only the holder of the seal can make one.

### 1.4 Hashes: a fingerprint of data


A **hash** turns any amount of data into a short, fixed-length fingerprint (e.g. SHA-256 gives 64 hex characters).

- Same input, same hash, every time.
- Change one character and the hash is completely different.
- You can't work backwards from the hash to the data.

Hashes show up as **certificate thumbprints** (the long hex string IIS and Windows show you), and they're part of how signatures work: you sign the hash of a document, not the whole document.

> Avoid the old algorithms **MD5** and **SHA-1** anywhere you have a choice. They're broken for security purposes.

---

## Part 2: Certificates and PKI

### 2.1 The trust problem

Public-key crypto lets a browser talk privately to a server. But how does the browser know the public key it received **really belongs to** `intranet.council.qld.gov.au` and not to an attacker sitting in the middle?

It needs someone trustworthy to vouch: "this public key belongs to this name." That vouching is a **certificate**, and the system of who vouches for whom is **PKI** (Public Key Infrastructure).

A certificate is basically an **ID card for a public key**, signed by an authority everyone agrees to trust, the same way a driver's licence is trusted because the government issued it.

### 2.2 What's inside a certificate

*📽️ Slides [18](/present/tls-trust/#18), [19](/present/tls-trust/#19)*


| Field | What it means | Example |
|---|---|---|
| **Subject** | Who the cert was issued to | `CN=app.council.qld.gov.au` |
| **Subject Alternative Names (SAN)** | **The names it's actually valid for.** Browsers only check this list. | `app.council.qld.gov.au`, `app01.corp.local` |
| **Issuer** | Which CA signed it | `CN=[Issuing CA name]` |
| **Valid from / to** | The dates it's good for | `2026-03-01` to `2026-09-17` |
| **Public key** | The server's public key | RSA 2048 / ECDSA P-256 |
| **Key usage / EKU** | What it may be used for | Server Authentication |
| **Thumbprint** | A hash of the whole cert, used to identify it | `3A9F…` |
| **Signature** | The issuer's signature over all of the above | |

The certificate **does not contain the private key**. The private key sits separately on the server (or inside a .pfx file; more on that later).

> A common trap: the old **Common Name (CN)** field is ignored by modern browsers. If the name isn't in the **SAN** list, the cert fails, even if the CN is right.

### 2.3 The chain of trust

*📽️ Slide [10](/present/tls-trust/#10)*


Certificates are signed by **Certificate Authorities (CAs)**, arranged in a chain:

```
Root CA                 (self-signed, kept offline, valid ~20 years,
   │                     pre-installed in every trust store)
   ▼ signs
Intermediate CA         (does the day-to-day issuing)
   │
   ▼ signs
Server certificate      (installed on your IIS / Apache / SQL server)
```

- Your computer has a **trust store**: a list of root CAs it trusts. Windows, macOS, browsers, Java and Linux each have their own.
- When a server presents its certificate, it should also send the **intermediate**. The client follows the signatures up the chain until it reaches a root it already trusts.
- If any link is missing or untrusted, the connection fails.

The single most common server-side mistake is **not sending the intermediate**. Browsers often paper over it by fetching the missing piece, but Java, PHP, curl and Python usually don't, so "it works in Chrome" proves nothing.

### 2.4 Public CAs vs our internal CA

*📽️ Slide [23](/present/tls-trust/#23)*


| | Public CA | Internal CA |
|---|---|---|
| Examples | DigiCert, Sectigo, Let's Encrypt | [Our internal CA name, e.g. Active Directory Certificate Services] |
| Trusted by | Every browser and device in the world | Only machines we've told to trust it (domain-joined PCs via Group Policy) |
| Use for | Anything the public, phones, vendors or SaaS reach | Internal-only services: `*.corp.local`, server-to-server, SQL, LDAPS |
| Names it can cover | Only real public domains we own, like `council.qld.gov.au` | Any name, including `corp.local` |
| Cost / speed | Paid or ACME-automated | Free, but we run and protect it |

Rule of thumb: **if anything outside our domain-joined fleet needs to trust it, it needs a public cert.** A public CA will never issue a cert for `server.corp.local`.

> **Fill in:** how to request an internal cert and how to request a public cert here. [Link to request process / ticket category].

---

## Part 3: TLS

### 3.1 What TLS gives you

*📽️ Slide [7](/present/tls-trust/#7)*


**TLS (Transport Layer Security)** is the protocol that wraps a normal connection in encryption. "SSL" is its old name, and people still say "SSL certificate"; it means the same thing.

TLS gives three guarantees:

| Guarantee | Meaning | Without it |
|---|---|---|
| **Confidentiality** | Nobody in between can read the traffic | Passwords and data visible on the wire |
| **Integrity** | Nobody can change the traffic undetected | Pages or queries silently altered |
| **Authentication** | You're talking to the real server | You could be talking to an impostor |

TLS isn't just for websites. It's underneath:

- **HTTPS** (HTTP over TLS, port 443)
- **SQL Server** connections (encrypted TDS)
- **LDAPS** (LDAP over TLS, port 636) to domain controllers
- **SMTP** with STARTTLS between mail servers
- **RDP**, WinRM over HTTPS, SFTP-adjacent tools, API calls between apps, and most SaaS integrations

### 3.2 What happens when a client connects (the handshake)

*📽️ Slide [12](/present/tls-trust/#12)*


Simplified, for TLS 1.3:

1. **Client → Server: "Hello."** The client says which TLS versions and ciphers it supports and which name it wants (SNI, e.g. `app.council.qld.gov.au`).
2. **Server → Client: "Hello, here's my certificate."** The server picks the settings, sends its certificate plus the intermediate, and proves it holds the matching private key by signing part of the handshake.
3. **Client checks the certificate.** Name, dates, chain, revocation. (See 3.3.) If anything fails, it stops here with an error.
4. **Both sides agree a shared session key.** They use a key-exchange method (ECDHE) so that the session key is never sent over the wire at all.
5. **Encrypted traffic flows.** Everything from here uses fast symmetric encryption (AES or ChaCha20) with that session key.

So public-key crypto is used **briefly, at the start**, to prove identity and agree a key. Then the cheap, fast symmetric encryption from Part 1 does the heavy lifting. That's how Part 1's key-sharing problem gets solved.

Because each session gets a fresh key, recording traffic today and stealing the server's private key later still doesn't decrypt it. That's called **forward secrecy**.

### 3.3 What the client checks

*📽️ Slide [14](/present/tls-trust/#14)*


Every client runs the same four checks. Each one failing gives a recognisable error:

| Check | Question | Typical failure |
|---|---|---|
| **Name** | Is the name I connected to in the cert's SAN list? | Browsing by IP, by short name (`app01`), or by an alias not on the cert |
| **Dates** | Is today between "valid from" and "valid to"? | Expired cert; or a server clock that's wrong |
| **Chain** | Does the chain lead to a root I trust? | Missing intermediate; internal CA not trusted on that client; self-signed cert |
| **Revocation** | Has the CA cancelled this cert? | Revoked after a key leak; or the client can't reach the CRL/OCSP URL through the firewall |

When you see a certificate error, ask which of these four failed. That's usually 90% of the diagnosis.

### 3.4 Versions and ciphers

| Version | Status |
|---|---|
| SSL 2.0 / 3.0 | Broken. Must be off. |
| TLS 1.0 / 1.1 | Deprecated (RFC 8996). Should be off. |
| **TLS 1.2** | Fine, with modern ciphers. Still the baseline for compatibility. |
| **TLS 1.3** | Preferred. Faster, simpler, removes old weak options. |

On Windows Server, protocol and cipher settings live in the registry (SCHANNEL) and apply to IIS, SQL Server, RDP and anything else that uses the Windows TLS stack. Change them via [our standard: GPO / IIS Crypto template / build standard], not by hand on individual servers.

Older apps (old .NET Framework, old Java, old PHP) sometimes can't do TLS 1.2+. That's a reason to upgrade the app, not to turn old TLS back on.

---

## Part 4: In our environment

### 4.1 Where you'll meet certificates

*📽️ Slides [22](/present/tls-trust/#22), [27](/present/tls-trust/#27)*


| Platform | Where the cert lives | Things to know |
|---|---|---|
| **IIS** | Windows cert store: *Local Computer → Personal* (`certlm.msc`). Bound per site in *Bindings*. | Bind by hostname with SNI if several sites share an IP. The private key must be marked as present (key icon). |
| **SQL Server** | Windows cert store, selected in SQL Server Configuration Manager. | The SQL service account needs read access to the private key. New drivers (ODBC 18, Microsoft.Data.SqlClient 4+) **encrypt by default and validate the cert**. |
| **Apache / nginx / PHP** | PEM files on disk: cert, chain, key. | Use the **full chain** file. Key file permissions should be root/service only. |
| **Java apps** | Keystores (`.jks` / `.p12`) and Java's own `cacerts` trust store. | Java **ignores the Windows trust store** by default, so our internal CA must be imported into `cacerts` separately. |
| **Python / Node / curl** | Their own CA bundles. | Same as Java: may not trust our internal CA unless told to. |
| **Load balancers / firewalls** | Their own cert stores. | If TLS terminates here, the cert on the backend server may not be the one users see. |

> **TLS inspection:** if our firewalls decrypt outbound traffic [confirm whether and where], then outbound HTTPS from a server is re-signed with an internal CA. Windows apps cope because they trust that CA. Java, Python and PHP apps calling external APIs often fail with chain errors. Check this before blaming the vendor.

### 4.2 Certificate file formats cheat sheet


| Extension | What's in it | Private key? | Handle as |
|---|---|---|---|
| `.cer` / `.crt` | One certificate (PEM text or DER binary) | No | Public, share freely |
| `.pem` | Text, `-----BEGIN …-----` blocks. Can hold certs, keys or both. | Maybe; look inside | Check before sharing |
| `.key` | A private key (PEM) | **Yes** | Secret |
| `.csr` | Certificate Signing Request: your public key + requested names, sent to the CA | No | Fine to send to the CA |
| `.pfx` / `.p12` | Cert + chain + **private key**, password-protected bundle | **Yes** | Secret. Treat like a password. |
| `.p7b` | Cert chain only (common from CAs) | No | Public |

The easy rule: **if it has a private key in it, it's a secret.** Don't email it, don't put it on a file share, don't commit it to git, and send the password a different way from the file.

Generating the CSR **on the server that will use the cert** means the private key never has to travel at all. That's the best option where you can.

### 4.3 Common errors and what they usually mean


| You see | Likely cause | Check |
|---|---|---|
| `NET::ERR_CERT_DATE_INVALID` | Expired (or server clock wrong) | Expiry date; renew |
| `NET::ERR_CERT_COMMON_NAME_INVALID` | Name not in SAN | Are users using a name/alias/IP not on the cert? |
| `NET::ERR_CERT_AUTHORITY_INVALID` | Chain doesn't reach a trusted root | Self-signed? Internal CA on a non-domain device? Missing intermediate? |
| `unable to get local issuer certificate` (curl, PHP, Python) | Missing intermediate, or internal CA not in that app's CA bundle | Serve the full chain; add CA to app bundle |
| `PKIX path building failed` (Java) | Same as above, for Java | Import CA into the right `cacerts` |
| SQL: `The certificate chain was issued by an authority that is not trusted` | SQL is using a self-signed or untrusted cert; new driver now validates | Put a proper internal-CA cert on SQL |
| `The remote certificate is invalid` (.NET) | Any of the four checks | Look at the inner exception for which one |
| `handshake failure` / `protocol version` | Client and server share no TLS version or cipher | Old client needs TLS 1.0? Upgrade the client |

### 4.4 Habits to avoid

*📽️ Slide [28](/present/tls-trust/#28)*


These all "fix" the error by switching off the check that was protecting you:

- **`TrustServerCertificate=True`** in SQL connection strings. Encryption stays on, but anyone in the middle can impersonate the server.
- **`curl -k`**, PHP `verify_peer => false`, Python `verify=False`, Java "trust all" managers in production code.
- **Self-signed certs in production.** Fine on a lab box, not on anything users or other systems depend on.
- **Emailing or file-sharing .pfx files**, or putting the password in the same email.
- **Private keys in git**, in scripts, or in a ticket attachment.
- **One wildcard cert copied everywhere.** One compromised server leaks the key for every site. Prefer per-service certs.
- **Clicking through browser warnings** and teaching users to do the same.

If a vendor's install guide tells you to do any of these, raise it before following it.

---

## Part 5: Lifecycle and checking your own servers

### 5.1 The certificate lifecycle


1. **Request:** generate a key pair and CSR (ideally on the target server) with the right SAN names.
2. **Issue:** the CA validates and signs it.
3. **Install:** import the cert (and chain), bind it to the service, restart if needed.
4. **Monitor:** know when every cert expires. [Our monitoring tool / NetBox CMDB record].
5. **Renew or replace:** before expiry, not after. Then remove the old one.

**Public certificate lifetimes are shrinking fast.** Under the CA/Browser Forum's rules, the maximum validity of a public TLS certificate is:

| From | Maximum validity |
|---|---|
| 15 March 2026 | 200 days |
| 15 March 2027 | 100 days |
| 15 March 2029 | 47 days |

Manual renewal stops being practical at that pace. That's why we're moving to **automated issuance (ACME)** for public certs. Internal CA certs aren't bound by these rules but should still be tracked.

### 5.2 Check your own servers


**Windows, list certs expiring in the next 60 days (PowerShell, run as admin):**

```powershell
Get-ChildItem Cert:\LocalMachine\My |
  Where-Object { $_.NotAfter -lt (Get-Date).AddDays(60) } |
  Select-Object Subject, NotAfter, Thumbprint, HasPrivateKey
```

**Windows, see which cert each IIS site is using:**

```powershell
Get-WebBinding -Protocol https | Select-Object bindingInformation, certificateHash
```

**Any machine with OpenSSL, see what a server actually presents:**

```bash
openssl s_client -connect app.council.qld.gov.au:443 -servername app.council.qld.gov.au -showcerts </dev/null
```

Look for: the names (SAN), the dates, and whether the intermediate is sent (more than one cert in the output).

**In a browser:** click the padlock or site settings → certificate. Check *Issued to*, *Issued by*, *Valid to*, and the *Certification Path* tab.

**GUI:** `certlm.msc` opens the computer's certificate store on Windows.

---

## Recap: five things to remember

*📽️ Slide [41](/present/tls-trust/#41)*


1. **Public key is public, private key is secret.** Anything containing a private key (`.key`, `.pfx`) is a password-level secret.
2. **A certificate is an ID card for a public key**, signed by a CA. Clients trust it because they trust the CA at the top of the chain.
3. **TLS uses certs to prove identity and agree a key,** then encrypts everything with fast symmetric crypto.
4. **Every cert error is name, date, chain or revocation.** Work out which, and the fix is usually obvious.
5. **Never fix a cert error by turning checking off.** Fix the cert, the chain or the trust store instead.

---

## Next steps and contacts


- Requesting a certificate: [process / ticket category]
- Questions about TLS settings or the internal CA: [team / contact]
- Cert inventory and expiry tracking: [where it lives]

**Homework (5 minutes):** run the PowerShell expiry check above on one server you own and note anything expiring before [date].
